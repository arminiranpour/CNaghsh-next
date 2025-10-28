"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SubscriptionStatus } from "@prisma/client";

import { recordAuditLog } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/db";
import { CAN_PUBLISH_PROFILE } from "@/lib/billing/entitlementKeys";
import { syncSingleUser } from "@/lib/billing/entitlementSync";
import { emit } from "@/lib/billing/events";

const idSchema = z.string().cuid();
const reasonSchema = z
  .string({ invalid_type_error: "لطفاً دلیل را به صورت متن وارد کنید." })
  .trim()
  .min(5, "دلیل باید حداقل ۵ کاراکتر باشد.")
  .max(2000, "حداکثر ۲۰۰۰ کاراکتر مجاز است.");
const timestampSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "زمان نامعتبر است.");
const dateSchema = z
  .string({ invalid_type_error: "تاریخ وارد شده معتبر نیست." })
  .refine((value) => !Number.isNaN(Date.parse(value)), "تاریخ نامعتبر است.");

const SUBSCRIPTIONS_PATH = "/admin/billing/subscriptions";

function toIso(date: Date) {
  return date.toISOString();
}

function assertFreshness(current: Date, expectedIso: string) {
  const expected = new Date(expectedIso);
  if (Number.isNaN(expected.getTime())) {
    throw new Error("مقدار زمان نامعتبر است.");
  }
  if (current.getTime() !== expected.getTime()) {
    throw new Error("داده‌های اشتراک به‌روزرسانی شده است. لطفاً صفحه را تازه‌سازی کنید.");
  }
}

function mapSubscriptionSnapshot(subscription: {
  id: string;
  status: SubscriptionStatus;
  startedAt: Date;
  endsAt: Date;
  renewalAt: Date | null;
  cancelAtPeriodEnd: boolean;
  providerRef: string | null;
}) {
  return {
    status: subscription.status,
    startedAt: toIso(subscription.startedAt),
    endsAt: toIso(subscription.endsAt),
    renewalAt: subscription.renewalAt ? toIso(subscription.renewalAt) : null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    providerRef: subscription.providerRef ?? null,
  };
}

function mapEntitlementSnapshot(entitlement: {
  id: string;
  expiresAt: Date | null;
  updatedAt: Date;
} | null) {
  if (!entitlement) {
    return null;
  }
  return {
    id: entitlement.id,
    expiresAt: entitlement.expiresAt ? toIso(entitlement.expiresAt) : null,
    updatedAt: toIso(entitlement.updatedAt),
  };
}

function success() {
  return { ok: true } as const;
}

function failure(error: unknown) {
  if (error instanceof z.ZodError) {
    return { ok: false, error: error.issues[0]?.message ?? "درخواست نامعتبر است." } as const;
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message } as const;
  }
  return { ok: false, error: "خطای نامشخص رخ داد." } as const;
}

export async function cancelNowAction(input: {
  id: string;
  reason: string;
  updatedAt: string;
  idempotencyKey?: string;
}) {
  try {
    const admin = await requireAdmin();
    const parsed = {
      id: idSchema.parse(input.id),
      reason: reasonSchema.parse(input.reason),
      updatedAt: timestampSchema.parse(input.updatedAt),
      idempotencyKey: input.idempotencyKey,
    };

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: parsed.id },
        include: {
          plan: { select: { id: true, name: true } },
          user: { select: { id: true, email: true } },
        },
      });

      if (!subscription) {
        throw new Error("اشتراک یافت نشد.");
      }

      assertFreshness(subscription.updatedAt, parsed.updatedAt);

      const entitlementBefore = await tx.userEntitlement.findFirst({
        where: { userId: subscription.userId, key: CAN_PUBLISH_PROFILE },
        orderBy: { updatedAt: "desc" },
      });

      const updated = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.canceled,
          endsAt: now,
          renewalAt: null,
          cancelAtPeriodEnd: false,
        },
      });

      let entitlementAfter = entitlementBefore ?? null;
      if (entitlementBefore) {
        entitlementAfter = await tx.userEntitlement.update({
          where: { id: entitlementBefore.id },
          data: { expiresAt: now },
        });
      }

      return {
        subscription,
        updated,
        entitlementBefore,
        entitlementAfter,
      };
    });

    const reconciliation = await syncSingleUser(result.subscription.userId);

    await recordAuditLog({
      actor: admin,
      resource: { type: "subscription", id: result.subscription.id },
      action: "ADMIN_CANCEL_NOW",
      reason: parsed.reason,
      before: {
        subscription: mapSubscriptionSnapshot(result.subscription),
        entitlement: mapEntitlementSnapshot(result.entitlementBefore),
      },
      after: {
        subscription: mapSubscriptionSnapshot(result.updated),
        entitlement: mapEntitlementSnapshot(result.entitlementAfter),
      },
      metadata: reconciliation,
      idempotencyKey: parsed.idempotencyKey ?? null,
    });

    await emit({
      type: "SUBSCRIPTION_ADMIN_CANCELLED",
      userId: result.subscription.userId,
      subscriptionId: result.subscription.id,
      planId: result.subscription.planId,
      at: now,
      subscription: {
        status: SubscriptionStatus.canceled,
        startedAt: result.subscription.startedAt,
        endsAt: now,
        renewalAt: null,
        cancelAtPeriodEnd: false,
      },
    });

    await revalidatePath(SUBSCRIPTIONS_PATH);

    return success();
  } catch (error) {
    return failure(error);
  }
}

export async function cancelAtPeriodEndAction(input: {
  id: string;
  reason: string;
  updatedAt: string;
  cancel: boolean;
  idempotencyKey?: string;
}) {
  try {
    const admin = await requireAdmin();
    const parsed = {
      id: idSchema.parse(input.id),
      reason: reasonSchema.parse(input.reason),
      updatedAt: timestampSchema.parse(input.updatedAt),
      cancel: input.cancel,
      idempotencyKey: input.idempotencyKey,
    };

    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: parsed.id },
        include: { plan: true },
      });
      if (!subscription) {
        throw new Error("اشتراک یافت نشد.");
      }

      assertFreshness(subscription.updatedAt, parsed.updatedAt);

      const updated = await tx.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: parsed.cancel },
      });

      return { subscription, updated };
    });

    await recordAuditLog({
      actor: admin,
      resource: { type: "subscription", id: result.subscription.id },
      action: parsed.cancel ? "ADMIN_SET_CANCEL_AT_PERIOD_END" : "ADMIN_CLEAR_CANCEL_AT_PERIOD_END",
      reason: parsed.reason,
      before: { subscription: mapSubscriptionSnapshot(result.subscription) },
      after: { subscription: mapSubscriptionSnapshot(result.updated) },
      idempotencyKey: parsed.idempotencyKey ?? null,
    });

    await emit({
      type: parsed.cancel
        ? "SUBSCRIPTION_ADMIN_CANCEL_AT_PERIOD_END"
        : "SUBSCRIPTION_CANCEL_AT_PERIOD_END_CLEARED",
      userId: result.subscription.userId,
      subscriptionId: result.subscription.id,
      planId: result.subscription.planId,
      at: new Date(),
      subscription: {
        status: result.updated.status,
        startedAt: result.updated.startedAt,
        endsAt: result.updated.endsAt,
        renewalAt: result.updated.renewalAt,
        cancelAtPeriodEnd: result.updated.cancelAtPeriodEnd,
      },
    });

    await revalidatePath(SUBSCRIPTIONS_PATH);

    return success();
  } catch (error) {
    return failure(error);
  }
}

export async function adjustEndsAtAction(input: {
  id: string;
  reason: string;
  updatedAt: string;
  newEndsAt: string;
  idempotencyKey?: string;
}) {
  try {
    const admin = await requireAdmin();
    const parsed = {
      id: idSchema.parse(input.id),
      reason: reasonSchema.parse(input.reason),
      updatedAt: timestampSchema.parse(input.updatedAt),
      newEndsAt: dateSchema.parse(input.newEndsAt),
      idempotencyKey: input.idempotencyKey,
    };

    const newEndsAt = new Date(parsed.newEndsAt);

    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: parsed.id },
        include: { plan: true },
      });
      if (!subscription) {
        throw new Error("اشتراک یافت نشد.");
      }

      assertFreshness(subscription.updatedAt, parsed.updatedAt);

      const entitlementBefore = await tx.userEntitlement.findFirst({
        where: { userId: subscription.userId, key: CAN_PUBLISH_PROFILE },
        orderBy: { updatedAt: "desc" },
      });

      const updated = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          endsAt: newEndsAt,
          renewalAt: newEndsAt,
        },
      });

      let entitlementAfter = entitlementBefore ?? null;
      if (entitlementBefore) {
        entitlementAfter = await tx.userEntitlement.update({
          where: { id: entitlementBefore.id },
          data: { expiresAt: newEndsAt },
        });
      }

      return { subscription, updated, entitlementBefore, entitlementAfter };
    });

    await recordAuditLog({
      actor: admin,
      resource: { type: "subscription", id: result.subscription.id },
      action: "ADMIN_ADJUST_ENDS_AT",
      reason: parsed.reason,
      before: {
        subscription: mapSubscriptionSnapshot(result.subscription),
        entitlement: mapEntitlementSnapshot(result.entitlementBefore),
      },
      after: {
        subscription: mapSubscriptionSnapshot(result.updated),
        entitlement: mapEntitlementSnapshot(result.entitlementAfter),
      },
      idempotencyKey: parsed.idempotencyKey ?? null,
    });

    await emit({
      type: "SUBSCRIPTION_ADMIN_ENDS_ADJUSTED",
      userId: result.subscription.userId,
      subscriptionId: result.subscription.id,
      planId: result.subscription.planId,
      at: new Date(parsed.newEndsAt),
      subscription: {
        status: result.updated.status,
        startedAt: result.updated.startedAt,
        endsAt: result.updated.endsAt,
        renewalAt: result.updated.renewalAt,
        cancelAtPeriodEnd: result.updated.cancelAtPeriodEnd,
      },
    });

    await revalidatePath(SUBSCRIPTIONS_PATH);
    await syncSingleUser(result.subscription.userId);

    return success();
  } catch (error) {
    return failure(error);
  }
}

export async function recomputeEntitlementsAction(input: {
  userId: string;
  subscriptionId: string;
  reason: string;
  idempotencyKey?: string;
}) {
  try {
    const admin = await requireAdmin();
    const parsed = {
      userId: idSchema.parse(input.userId),
      subscriptionId: idSchema.parse(input.subscriptionId),
      reason: reasonSchema.parse(input.reason),
      idempotencyKey: input.idempotencyKey,
    };

    const subscription = await prisma.subscription.findUnique({
      where: { id: parsed.subscriptionId },
      select: { id: true, userId: true, planId: true },
    });

    if (!subscription) {
      throw new Error("اشتراک یافت نشد.");
    }

    if (subscription.userId !== parsed.userId) {
      throw new Error("شناسه کاربر با اشتراک هم‌خوانی ندارد.");
    }

    const summary = await syncSingleUser(subscription.userId);

    await recordAuditLog({
      actor: admin,
      resource: { type: "subscription", id: parsed.subscriptionId },
      action: "ADMIN_RECOMPUTE_ENTITLEMENTS",
      reason: parsed.reason,
      metadata: summary,
      idempotencyKey: parsed.idempotencyKey ?? null,
    });

    await emit({
      type: "SUBSCRIPTION_ADMIN_ENTITLEMENTS_SYNCED",
      userId: subscription.userId,
      subscriptionId: subscription.id,
      planId: subscription.planId,
      at: new Date(),
    });

    await revalidatePath(SUBSCRIPTIONS_PATH);

    return success();
  } catch (error) {
    return failure(error);
  }
}

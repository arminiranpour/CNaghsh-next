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
import {
  emitBillingCancelImmediate,
  emitBillingCancelScheduled,
} from "@/lib/notifications/events";
import {
  sendImmediateCancellationEmail,
  sendScheduledCancellationEmail,
} from "@/lib/billing/subscriptionNotifications";

const idSchema = z.string().cuid();
const reasonSchema = z
  .string({ invalid_type_error: "لطفاً دلیل را به صورت متن وارد کنید." })
  .trim()
  .min(5, "دلیل باید حداقل ۵ کاراکتر باشد.")
  .max(2000, "حداکثر ۲۰۰۰ کاراکتر مجاز است.");
const shortReasonSchema = z
  .string({ invalid_type_error: "لطفاً دلیل را به صورت متن وارد کنید." })
  .trim()
  .min(3, "دلیل باید حداقل ۳ کاراکتر باشد.")
  .max(2000, "حداکثر ۲۰۰۰ کاراکتر مجاز است.");
const timestampSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "زمان نامعتبر است.");
const dateSchema = z
  .string({ invalid_type_error: "تاریخ وارد شده معتبر نیست." })
  .refine((value) => !Number.isNaN(Date.parse(value)), "تاریخ نامعتبر است.");

const SUBSCRIPTIONS_PATH = "/admin/billing/subscriptions";

const VALID_CANCEL_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.active,
  SubscriptionStatus.renewing,
]);

type SubscriptionSnapshotSource = {
  id: string;
  status: SubscriptionStatus;
  startedAt: Date;
  endsAt: Date;
  renewalAt: Date | null;
  cancelAtPeriodEnd: boolean;
  providerRef: string | null;
};

type CancelNowRejectionCtx = SubscriptionSnapshotSource & {
  userId: string;
  planId: string;
  plan: { id: string; name: string | null };
  user: { id: string; email: string | null };
};

type CancelAtPeriodEndNoopCtx = {
  subscription: SubscriptionSnapshotSource & {
    userId: string;
    planId: string;
    plan: { id: string; name: string | null } | null;
  };
  reason: "invalid" | "no_change";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSubscriptionSnapshotSource(value: unknown): value is SubscriptionSnapshotSource {
  if (!isRecord(value)) return false;
  const snapshot = value as Record<string, unknown>;
  return (
    typeof snapshot.id === "string" &&
    typeof snapshot.status === "string" &&
    snapshot.startedAt instanceof Date &&
    snapshot.endsAt instanceof Date &&
    (snapshot.renewalAt === null || snapshot.renewalAt instanceof Date) &&
    typeof snapshot.cancelAtPeriodEnd === "boolean" &&
    (snapshot.providerRef === null || typeof snapshot.providerRef === "string")
  );
}

function isCancelNowCtx(value: unknown): value is CancelNowRejectionCtx {
  if (!isSubscriptionSnapshotSource(value)) return false;
  const ctx = value as SubscriptionSnapshotSource & Record<string, unknown>;
  return (
    typeof ctx.userId === "string" &&
    typeof ctx.planId === "string" &&
    isRecord(ctx.plan) &&
    typeof ctx.plan.id === "string" &&
    (ctx.plan.name === null || typeof ctx.plan.name === "string") &&
    isRecord(ctx.user) &&
    typeof ctx.user.id === "string" &&
    (ctx.user.email === null || typeof ctx.user.email === "string")
  );
}

function isNoopCtx(value: unknown): value is CancelAtPeriodEndNoopCtx {
  if (!isRecord(value)) return false;
  const ctx = value as Record<string, unknown>;
  if (ctx.reason !== "invalid" && ctx.reason !== "no_change") return false;
  if (!isSubscriptionSnapshotSource(ctx.subscription)) return false;
  const subscription = ctx.subscription as SubscriptionSnapshotSource & Record<string, unknown>;
  return (
    typeof subscription.userId === "string" &&
    typeof subscription.planId === "string" &&
    (subscription.plan === null ||
      (isRecord(subscription.plan) &&
        typeof subscription.plan.id === "string" &&
        (subscription.plan.name === null || typeof subscription.plan.name === "string")))
  );
}

/** Ensurers that return strongly-typed values (prevents TS narrowing to 'never') */
function ensureCancelNowCtx(value: unknown): CancelNowRejectionCtx {
  if (isCancelNowCtx(value)) return value;
  throw new Error("Invalid cancel-now context");
}

function ensureNoopCtx(value: unknown): CancelAtPeriodEndNoopCtx {
  if (isNoopCtx(value)) return value;
  throw new Error("Invalid noop context");
}

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

function mapSubscriptionSnapshot(subscription: SubscriptionSnapshotSource) {
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
  if (!entitlement) return null;
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
      idempotencyKey: input.idempotencyKey?.trim(),
    };

    const now = new Date();

    if (parsed.idempotencyKey) {
      const existingAudit = await prisma.auditLog.findUnique({
        where: { idempotencyKey: parsed.idempotencyKey },
        select: { id: true },
      });
      if (existingAudit) return success();
    }

    let rejectionContext: CancelNowRejectionCtx | null = null;

    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: parsed.id },
        include: {
          plan: { select: { id: true, name: true } },
          user: { select: { id: true, email: true } },
        },
      });

      if (!subscription) throw new Error("اشتراک یافت نشد.");

      assertFreshness(subscription.updatedAt, parsed.updatedAt);

      if (!VALID_CANCEL_STATUSES.has(subscription.status)) {
        rejectionContext = subscription;
        return null;
      }

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

      const entitlementAfter = entitlementBefore
        ? await tx.userEntitlement.update({
            where: { id: entitlementBefore.id },
            data: { expiresAt: now },
          })
        : null;

      return { subscription, updated, entitlementBefore, entitlementAfter };
    });

    if (!result) {
      if (rejectionContext) {
        const ctx = ensureCancelNowCtx(rejectionContext);
        await recordAuditLog({
          actor: admin,
          resource: { type: "subscription", id: parsed.id },
          action: "ADMIN_CANCEL_NOW_REJECTED",
          reason: parsed.reason,
          before: { subscription: mapSubscriptionSnapshot(ctx) },
          after: { subscription: mapSubscriptionSnapshot(ctx) },
          metadata: { status: ctx.status },
          idempotencyKey: parsed.idempotencyKey ?? null,
        });
        throw new Error("اشتراک در وضعیت فعلی قابل لغو فوری نیست.");
      }
      throw new Error("لغو اشتراک با خطا مواجه شد.");
    }

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

    await sendImmediateCancellationEmail({
      userId: result.subscription.userId,
      planName: result.subscription.plan.name,
      endedAt: now,
    });

    await emitBillingCancelImmediate({
      userId: result.subscription.userId,
      subscriptionId: result.subscription.id,
      endedAt: now,
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
      idempotencyKey: input.idempotencyKey?.trim(),
    };

    if (parsed.idempotencyKey) {
      const existingAudit = await prisma.auditLog.findUnique({
        where: { idempotencyKey: parsed.idempotencyKey },
        select: { id: true },
      });
      if (existingAudit) return success();
    }

    let noopContext: CancelAtPeriodEndNoopCtx | null = null;

    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: parsed.id },
        include: { plan: true },
      });
      if (!subscription) throw new Error("اشتراک یافت نشد.");

      assertFreshness(subscription.updatedAt, parsed.updatedAt);

      if (!VALID_CANCEL_STATUSES.has(subscription.status)) {
        noopContext = { subscription, reason: "invalid" };
        return null;
      }

      if (subscription.cancelAtPeriodEnd === parsed.cancel) {
        noopContext = { subscription, reason: "no_change" };
        return { subscription, updated: subscription, changed: false };
      }

      const updated = await tx.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: parsed.cancel },
      });

      return { subscription, updated, changed: true };
    });

    if (!result) {
      if (noopContext) {
        const nc = ensureNoopCtx(noopContext);
        if (nc.reason === "invalid") {
          await recordAuditLog({
            actor: admin,
            resource: { type: "subscription", id: parsed.id },
            action: parsed.cancel
              ? "ADMIN_SET_CANCEL_AT_PERIOD_END_REJECTED"
              : "ADMIN_CLEAR_CANCEL_AT_PERIOD_END_REJECTED",
            reason: parsed.reason,
            before: { subscription: mapSubscriptionSnapshot(nc.subscription) },
            after: { subscription: mapSubscriptionSnapshot(nc.subscription) },
            metadata: { status: nc.subscription.status },
            idempotencyKey: parsed.idempotencyKey ?? null,
          });
          throw new Error("وضعیت فعلی اشتراک اجازه ثبت این عملیات را نمی‌دهد.");
        }
      }
      throw new Error("ثبت لغو در پایان دوره با خطا مواجه شد.");
    }

    const { subscription, updated, changed } = result;

    await recordAuditLog({
      actor: admin,
      resource: { type: "subscription", id: subscription.id },
      action: parsed.cancel ? "ADMIN_SET_CANCEL_AT_PERIOD_END" : "ADMIN_CLEAR_CANCEL_AT_PERIOD_END",
      reason: parsed.reason,
      before: { subscription: mapSubscriptionSnapshot(subscription) },
      after: { subscription: mapSubscriptionSnapshot(updated) },
      metadata: changed ? undefined : { unchanged: true },
      idempotencyKey: parsed.idempotencyKey ?? null,
    });

    if (parsed.cancel && changed) {
      await sendScheduledCancellationEmail({
        userId: subscription.userId,
        planName: subscription.plan?.name,
        endsAt: updated.endsAt,
      });

      await emitBillingCancelScheduled({
        userId: subscription.userId,
        subscriptionId: subscription.id,
        endsAt: updated.endsAt,
      });
    }

    if (changed) {
      await emit({
        type: parsed.cancel
          ? "SUBSCRIPTION_ADMIN_CANCEL_AT_PERIOD_END"
          : "SUBSCRIPTION_CANCEL_AT_PERIOD_END_CLEARED",
        userId: subscription.userId,
        subscriptionId: subscription.id,
        planId: subscription.planId,
        at: new Date(),
        subscription: {
          status: updated.status,
          startedAt: updated.startedAt,
          endsAt: updated.endsAt,
          renewalAt: updated.renewalAt,
          cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
        },
      });
    }

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
      if (!subscription) throw new Error("اشتراک یافت نشد.");

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

      const entitlementAfter = entitlementBefore
        ? await tx.userEntitlement.update({
            where: { id: entitlementBefore.id },
            data: { expiresAt: newEndsAt },
          })
        : null;

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

export async function reactivateNowAction(input: {
  id: string;
  reason: string;
  updatedAt: string;
  newEndsAt: string;
}) {
  try {
    const admin = await requireAdmin();
    const parsed = {
      id: idSchema.parse(input.id),
      reason: shortReasonSchema.parse(input.reason),
      updatedAt: timestampSchema.parse(input.updatedAt),
      newEndsAt: dateSchema.parse(input.newEndsAt),
    };

    const newEndsAt = new Date(parsed.newEndsAt);
    if (newEndsAt <= new Date()) {
      throw new Error("تاریخ پایان باید در آینده باشد.");
    }

    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({ where: { id: parsed.id } });
      if (!subscription) throw new Error("اشتراک یافت نشد.");

      assertFreshness(subscription.updatedAt, parsed.updatedAt);

      const updated = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.active,
          cancelAtPeriodEnd: false,
          endsAt: newEndsAt,
        },
      });

      return { subscription, updated };
    });

    await recordAuditLog({
      actor: admin,
      resource: { type: "subscription", id: result.subscription.id },
      action: "ADMIN_REACTIVATE_NOW",
      reason: parsed.reason,
      before: { subscription: mapSubscriptionSnapshot(result.subscription) },
      after: { subscription: mapSubscriptionSnapshot(result.updated) },
      idempotencyKey: null,
    });

    await recomputeEntitlementsAction({
      userId: result.subscription.userId,
      subscriptionId: result.subscription.id,
      reason: `reactivate: ${parsed.reason}`,
    });

    await revalidatePath(SUBSCRIPTIONS_PATH);
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

    if (!subscription) throw new Error("اشتراک یافت نشد.");
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

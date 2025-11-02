import { PaymentStatus, Prisma, ProductType } from "@prisma/client";

import { prisma } from "../prisma";

import { CAN_PUBLISH_PROFILE } from "./entitlementKeys";
import { revalidateSubscriptionViews } from "@/lib/entitlements/revalidate";
import {
  activateOrStart,
  getSubscription,
  renew,
} from "./subscriptionService";

const SUBSCRIPTION_REASON = "SUBSCRIPTION_PURCHASE" as const;

export type ApplyPaymentToSubscriptionResult =
  | {
      applied: false;
      reason:
        | "PAYMENT_NOT_FOUND"
        | "PAYMENT_NOT_PAID"
        | "MISSING_PRICE"
        | "NOT_SUBSCRIPTION"
        | "ALREADY_GRANTED";
    }
  | {
      applied: true;
      action: "activated" | "renewed";
      subscriptionId: string;
      subscriptionEndsAt: Date;
      entitlementAction: "created" | "updated";
      entitlementId: string;
    };

type ApplyPaymentArgs = {
  paymentId: string;
};

const logDuplicateGuard = async (payment: { id: string; userId: string }) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: payment.userId,
        actorEmail: null,
        resourceType: "payment",
        resourceId: payment.id,
        action: "SUBSCRIPTION_DUPLICATE_GUARD",
        reason: SUBSCRIPTION_REASON,
        before: Prisma.DbNull,
        after: Prisma.DbNull,
        metadata: { status: "duplicate" },
        idempotencyKey: `subscription:${payment.id}:duplicate`,
      },
    });
  } catch (error) {
    console.error("[billing.subscription] audit_duplicate_failed", error);
  }
};

export const applyPaymentToSubscription = async ({
  paymentId,
}: ApplyPaymentArgs): Promise<ApplyPaymentToSubscriptionResult> => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      session: {
        include: {
          price: {
            include: {
              plan: {
                include: { product: true },
              },
              product: true,
            },
          },
        },
      },
    },
  });

  if (!payment) {
    return { applied: false, reason: "PAYMENT_NOT_FOUND" };
  }

  if (!payment.session?.price) {
    return { applied: false, reason: "MISSING_PRICE" };
  }

  if (payment.status !== PaymentStatus.PAID) {
    return { applied: false, reason: "PAYMENT_NOT_PAID" };
  }

  const price = payment.session.price;
  const plan = price.plan;

  if (!plan) {
    return { applied: false, reason: "MISSING_PRICE" };
  }

  if (!plan.product || plan.product.type !== ProductType.SUBSCRIPTION) {
    return { applied: false, reason: "NOT_SUBSCRIPTION" as const };
  }

  const subscription = await getSubscription(payment.userId);

  if (subscription?.endsAt) {
    const currentSubscriptionEndsAt = new Date(subscription.endsAt).getTime();

    const existingEntitlement = await prisma.userEntitlement.findFirst({
      where: {
        userId: payment.userId,
        key: CAN_PUBLISH_PROFILE,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: "desc" },
    });

    if (
      existingEntitlement?.expiresAt &&
      existingEntitlement.expiresAt.getTime() === currentSubscriptionEndsAt &&
      subscription.providerRef === payment.providerRef
    ) {
      await logDuplicateGuard(payment);
      return { applied: false, reason: "ALREADY_GRANTED" };
    }
  }

  const nextSubscription = subscription
    ? await renew({ userId: payment.userId, providerRef: payment.providerRef })
    : await activateOrStart({
        userId: payment.userId,
        planId: plan.id,
        providerRef: payment.providerRef,
      });

  const action = subscription ? ("renewed" as const) : ("activated" as const);
  const subscriptionEndsAt = nextSubscription.endsAt
    ? new Date(nextSubscription.endsAt)
    : new Date();

  const entitlementResult = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const existing = await tx.userEntitlement.findFirst({
      where: {
        userId: payment.userId,
        key: CAN_PUBLISH_PROFILE,
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: "desc" },
    });

    if (existing?.expiresAt && existing.expiresAt.getTime() === subscriptionEndsAt.getTime()) {
      return {
        status: "duplicate" as const,
        entitlement: existing,
        previousExpiresAt: existing.expiresAt,
      };
    }

    if (existing) {
      const updated = await tx.userEntitlement.update({
        where: { id: existing.id },
        data: {
          expiresAt: subscriptionEndsAt,
          remainingCredits: null,
        },
      });

      return {
        status: "updated" as const,
        entitlement: updated,
        previousExpiresAt: existing.expiresAt,
      };
    }

    const created = await tx.userEntitlement.create({
      data: {
        userId: payment.userId,
        key: CAN_PUBLISH_PROFILE,
        expiresAt: subscriptionEndsAt,
        remainingCredits: null,
      },
    });

    return {
      status: "created" as const,
      entitlement: created,
      previousExpiresAt: null,
    };
  });

  if (entitlementResult.status === "duplicate") {
    await logDuplicateGuard(payment);

    return { applied: false, reason: "ALREADY_GRANTED" };
  }

  try {
    await prisma.auditLog.create({
      data: {
        actorId: payment.userId,
        actorEmail: null,
        resourceType: "payment",
        resourceId: payment.id,
        action: "SUBSCRIPTION_GRANTED",
        reason: SUBSCRIPTION_REASON,
        before: entitlementResult.previousExpiresAt
          ? { expiresAt: entitlementResult.previousExpiresAt.toISOString() }
          : Prisma.DbNull,
        after: {
          entitlementId: entitlementResult.entitlement.id,
          expiresAt: subscriptionEndsAt.toISOString(),
          subscriptionId: nextSubscription.id,
          planId: nextSubscription.planId,
          status: entitlementResult.status,
        },
        metadata: Prisma.DbNull,
        idempotencyKey: `subscription:${payment.id}`,
      },
    });
  } catch (error) {
    console.error("[billing.subscription] audit_grant_failed", error);
  }

  await revalidateSubscriptionViews(payment.userId);

  return {
    applied: true,
    action,
    subscriptionId: nextSubscription.id,
    subscriptionEndsAt,
    entitlementAction: entitlementResult.status,
    entitlementId: entitlementResult.entitlement.id,
  };
};

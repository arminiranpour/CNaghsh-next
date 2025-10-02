import { PaymentStatus, PlanCycle, ProductType, type EntitlementKey } from "@prisma/client";

import { prisma } from "@/lib/db";
import { CAN_PUBLISH_PROFILE, JOB_POST_CREDIT } from "./entitlementKeys";

type ApplyEntitlementsArgs = {
  userId: string;
  priceId: string;
  paymentId: string;
};

type FailureResult = {
  ok: false;
  wasApplied: false;
  reason: string;
};

type SkippedResult = {
  ok: true;
  wasApplied: false;
  reason: string;
};

type SubscriptionResult = {
  ok: true;
  wasApplied: true;
  intent: "subscription";
  entitlement: {
    key: typeof CAN_PUBLISH_PROFILE;
    expiresAt: Date | null;
  };
};

type JobCreditResult = {
  ok: true;
  wasApplied: true;
  intent: "job_post";
  entitlement: {
    key: typeof JOB_POST_CREDIT;
    remainingCredits: number;
  };
};

type ApplyEntitlementsResult = SubscriptionResult | JobCreditResult | FailureResult | SkippedResult;

const cycleToMonths: Record<PlanCycle, number> = {
  [PlanCycle.MONTHLY]: 1,
  [PlanCycle.QUARTERLY]: 3,
  [PlanCycle.YEARLY]: 12,
};

const addMonthsUtc = (date: Date, months: number) => {
  const utc = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
  return utc;
};

export const applyEntitlements = async ({
  userId,
  priceId,
  paymentId,
}: ApplyEntitlementsArgs): Promise<ApplyEntitlementsResult> => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { status: true, updatedAt: true },
  });

  if (!payment) {
    return { ok: false, wasApplied: false, reason: "PAYMENT_NOT_FOUND" };
  }

  if (payment.status !== PaymentStatus.PAID) {
    return { ok: false, wasApplied: false, reason: "PAYMENT_NOT_PAID" };
  }

  const price = await prisma.price.findUnique({
    where: { id: priceId },
    include: {
      plan: {
        include: {
          product: {
            select: { id: true, type: true },
          },
        },
      },
      product: {
        select: { id: true, type: true },
      },
    },
  });

  if (!price || !price.active) {
    return { ok: false, wasApplied: false, reason: "PRICE_NOT_AVAILABLE" };
  }

  const now = new Date();
  const paymentUpdatedAt = payment.updatedAt;

  if (price.planId && price.plan && price.plan.product?.type === ProductType.SUBSCRIPTION) {
    const cycle = price.plan.cycle;
    const months = cycleToMonths[cycle];

    const key: EntitlementKey = CAN_PUBLISH_PROFILE;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.userEntitlement.findUnique({
        where: {
          userId_key: {
            userId,
            key,
          },
        },
        select: {
          expiresAt: true,
          updatedAt: true,
        },
      });

      if (existing && existing.updatedAt >= paymentUpdatedAt) {
        return existing;
      }

      const anchor = existing?.expiresAt && existing.expiresAt > now ? existing.expiresAt : now;
      const newExpiry = addMonthsUtc(anchor, months);

      const updated = await tx.userEntitlement.upsert({
        where: {
          userId_key: {
            userId,
            key,
          },
        },
        create: {
          userId,
          key,
          expiresAt: newExpiry,
        },
        update: {
          expiresAt: newExpiry,
        },
        select: {
          expiresAt: true,
          updatedAt: true,
        },
      });

      return updated;
    });

    return {
      ok: true,
      wasApplied: true,
      intent: "subscription",
      entitlement: {
        key,
        expiresAt: result.expiresAt,
      },
    };
  }

  if (price.productId && price.product?.type === ProductType.JOB_POST) {
    const key: EntitlementKey = JOB_POST_CREDIT;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.userEntitlement.findUnique({
        where: {
          userId_key: {
            userId,
            key,
          },
        },
        select: {
          remainingCredits: true,
          updatedAt: true,
        },
      });

      if (existing && existing.updatedAt >= paymentUpdatedAt) {
        return existing;
      }

      const nextCredits = (existing?.remainingCredits ?? 0) + 1;

      const updated = await tx.userEntitlement.upsert({
        where: {
          userId_key: {
            userId,
            key,
          },
        },
        create: {
          userId,
          key,
          remainingCredits: nextCredits,
        },
        update: {
          remainingCredits: nextCredits,
        },
        select: {
          remainingCredits: true,
          updatedAt: true,
        },
      });

      return updated;
    });

    return {
      ok: true,
      wasApplied: true,
      intent: "job_post",
      entitlement: {
        key,
        remainingCredits: result.remainingCredits ?? 0,
      },
    };
  }

  return {
    ok: true,
    wasApplied: false,
    reason: "UNSUPPORTED_PRICE_INTENT",
  };
};
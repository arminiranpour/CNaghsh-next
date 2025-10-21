import {
  PlanCycle,
  ProductType,
  SubscriptionStatus,
  type Prisma,
} from "@prisma/client";

import { prisma } from "../prisma";
import { emit, type BillingEventType } from "./events";

const cycleToMonths: Record<PlanCycle, number> = {
  [PlanCycle.MONTHLY]: 1,
  [PlanCycle.QUARTERLY]: 3,
  [PlanCycle.YEARLY]: 12,
};

const addMonthsUtc = (date: Date, months: number) => {
  return new Date(
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
};

export const computePeriodEnds = (start: Date, cycle: PlanCycle) => {
  const startUtc = new Date(start);
  return addMonthsUtc(startUtc, cycleToMonths[cycle]);
};

export const nextPeriodFrom = (anchor: Date, cycle: PlanCycle) => {
  const startedAt = new Date(anchor);
  const endsAt = computePeriodEnds(startedAt, cycle);
  return { startedAt, endsAt };
};

export const coalesceAnchor = (current?: Date | null, nowInput = new Date()) => {
  const now = new Date(nowInput);
  if (!current) {
    return now;
  }
  return current.getTime() > now.getTime() ? new Date(current) : now;
};

export class PlanNotFoundError extends Error {
  constructor(planId: string) {
    super(`PLAN_NOT_FOUND:${planId}`);
    this.name = "PlanNotFoundError";
  }
}

export class SubscriptionNotFoundError extends Error {
  constructor(userId: string) {
    super(`SUBSCRIPTION_NOT_FOUND:${userId}`);
    this.name = "SubscriptionNotFoundError";
  }
}

type SubscriptionWithPlan = Prisma.SubscriptionGetPayload<{
  include: { plan: true };
}>;

const mapInclude = { plan: true } as const;

const emitSubscriptionEvent = async (
  type: BillingEventType,
  subscription: SubscriptionWithPlan,
) => {
  await emit({
    type,
    userId: subscription.userId,
    subscriptionId: subscription.id,
    planId: subscription.planId,
    at: new Date(),
    subscription: {
      status: subscription.status,
      startedAt: subscription.startedAt,
      endsAt: subscription.endsAt,
      renewalAt: subscription.renewalAt,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    },
  });
};

export const getSubscription = async (userId: string) => {
  return prisma.subscription.findUnique({
    where: { userId },
    include: mapInclude,
  });
};

type ActivateOrStartArgs = {
  userId: string;
  planId: string;
  providerRef?: string;
  startsAt?: Date;
  endsAt?: Date;
};

export const activateOrStart = async ({
  userId,
  planId,
  providerRef,
  startsAt,
  endsAt,
}: ActivateOrStartArgs) => {
  const now = new Date();

  const { subscription, eventType } = await prisma.$transaction(
    async (tx) => {
      const plan = await tx.plan.findUnique({
        where: { id: planId },
        select: { id: true, cycle: true, productId: true },
      });

      if (!plan) {
        throw new PlanNotFoundError(planId);
      }

      const product = await tx.product.findUnique({
        where: { id: plan.productId },
        select: { type: true },
      });

      if (!product || product.type !== ProductType.SUBSCRIPTION) {
        throw new Error("PLAN_NOT_SUBSCRIPTION");
      }

      const existing = await tx.subscription.findUnique({
        where: { userId },
        include: mapInclude,
      });

      if (!existing) {
        const anchor = startsAt ? new Date(startsAt) : now;
        const period =
          endsAt && endsAt.getTime() > anchor.getTime()
            ? { startedAt: new Date(anchor), endsAt: new Date(endsAt) }
            : nextPeriodFrom(anchor, plan.cycle);

        const created = await tx.subscription.create({
          data: {
            userId,
            planId: plan.id,
            status: SubscriptionStatus.active,
            startedAt: period.startedAt,
            endsAt: period.endsAt,
            renewalAt: period.endsAt,
            cancelAtPeriodEnd: false,
            providerRef,
          },
          include: mapInclude,
        });

        return { subscription: created, eventType: "SUBSCRIPTION_ACTIVATED" as BillingEventType };
      }

      const anchorBase = startsAt && startsAt.getTime() > now.getTime() ? startsAt : existing.endsAt;
      const anchor = coalesceAnchor(anchorBase ?? existing.endsAt, now);
      const period =
        endsAt && endsAt.getTime() > anchor.getTime()
          ? { startedAt: new Date(anchor), endsAt: new Date(endsAt) }
          : nextPeriodFrom(anchor, plan.cycle);

      const updated = await tx.subscription.update({
        where: { id: existing.id },
        data: {
          planId: plan.id,
          status: SubscriptionStatus.active,
          startedAt: period.startedAt,
          endsAt: period.endsAt,
          renewalAt: period.endsAt,
          cancelAtPeriodEnd: false,
          providerRef: providerRef ?? existing.providerRef,
        },
        include: mapInclude,
      });

      const event: BillingEventType =
        existing.status === SubscriptionStatus.active ||
        existing.status === SubscriptionStatus.renewing
          ? "SUBSCRIPTION_ACTIVATED"
          : "SUBSCRIPTION_RESTARTED";

      return { subscription: updated, eventType: event };
    },
    { timeout: 10_000 },
  );

  await emitSubscriptionEvent(eventType, subscription);
  return subscription;
};

type RenewArgs = {
  userId: string;
  providerRef?: string;
};

export const renew = async ({ userId, providerRef }: RenewArgs) => {
  const now = new Date();

  const { subscription } = await prisma.$transaction(async (tx) => {
    const existing = await tx.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!existing) {
      throw new SubscriptionNotFoundError(userId);
    }

    const anchor = coalesceAnchor(existing.endsAt, now);
    const period = nextPeriodFrom(anchor, existing.plan.cycle);

    const status =
      existing.status === SubscriptionStatus.active ||
      existing.status === SubscriptionStatus.renewing
        ? existing.status
        : SubscriptionStatus.active;

    const updated = await tx.subscription.update({
      where: { id: existing.id },
      data: {
        status,
        startedAt: period.startedAt,
        endsAt: period.endsAt,
        renewalAt: period.endsAt,
        cancelAtPeriodEnd: false,
        providerRef: providerRef ?? existing.providerRef,
      },
      include: mapInclude,
    });

    return { subscription: updated };
  });

  await emitSubscriptionEvent("SUBSCRIPTION_RENEWED", subscription);
  return subscription;
};

type MarkExpiredArgs = {
  userId: string;
  reason?: "period_end" | "admin" | "refund";
};

export const markExpired = async ({ userId }: MarkExpiredArgs) => {
  const { subscription } = await prisma.$transaction(async (tx) => {
    const existing = await tx.subscription.findUnique({
      where: { userId },
      include: mapInclude,
    });

    if (!existing) {
      throw new SubscriptionNotFoundError(userId);
    }

    const updated = await tx.subscription.update({
      where: { id: existing.id },
      data: {
        status: SubscriptionStatus.expired,
        cancelAtPeriodEnd: existing.cancelAtPeriodEnd,
      },
      include: mapInclude,
    });

    return { subscription: updated };
  });

  await emitSubscriptionEvent("SUBSCRIPTION_EXPIRED", subscription);
  return subscription;
};

type SetCancelArgs = {
  userId: string;
  flag: boolean;
};

export const setCancelAtPeriodEnd = async ({ userId, flag }: SetCancelArgs) => {
  const { subscription, eventType } = await prisma.$transaction(async (tx) => {
    const existing = await tx.subscription.findUnique({
      where: { userId },
      include: mapInclude,
    });

    if (!existing) {
      throw new SubscriptionNotFoundError(userId);
    }

    let status = existing.status;

    if (flag && existing.status === SubscriptionStatus.active) {
      status = SubscriptionStatus.renewing;
    } else if (!flag && existing.status === SubscriptionStatus.renewing) {
      status = SubscriptionStatus.active;
    }

    const updated = await tx.subscription.update({
      where: { id: existing.id },
      data: {
        cancelAtPeriodEnd: flag,
        status,
      },
      include: mapInclude,
    });

    const eventType: BillingEventType = flag
      ? "SUBSCRIPTION_CANCEL_AT_PERIOD_END_SET"
      : "SUBSCRIPTION_CANCEL_AT_PERIOD_END_CLEARED";

    return { subscription: updated, eventType };
  });

  await emitSubscriptionEvent(eventType, subscription);
  return subscription;
};


import { SubscriptionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { buildAbsoluteUrl } from "@/lib/url";

import { emitBillingExpiryReminder } from "./events";

const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  const base = new Date(date);
  base.setUTCHours(0, 0, 0, 0);
  return base;
}

export async function queueSubscriptionExpiryReminders(referenceDate = new Date()): Promise<number> {
  const todayUtc = startOfUtcDay(referenceDate);
  const reminderStart = new Date(todayUtc.getTime() + 3 * MILLISECONDS_IN_DAY);
  const reminderEnd = new Date(reminderStart.getTime() + MILLISECONDS_IN_DAY);

  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: { in: [SubscriptionStatus.active, SubscriptionStatus.renewing] },
      cancelAtPeriodEnd: false,
      endsAt: {
        gte: reminderStart,
        lt: reminderEnd,
      },
    },
    select: {
      id: true,
      userId: true,
      endsAt: true,
    },
  });

  for (const subscription of subscriptions) {
    await emitBillingExpiryReminder({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      endsAt: subscription.endsAt,
      reminderDate: todayUtc,
      renewUrl: buildAbsoluteUrl("/dashboard/billing"),
    });
  }

  return subscriptions.length;
}

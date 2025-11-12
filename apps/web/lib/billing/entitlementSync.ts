import { Prisma, SubscriptionStatus } from "@prisma/client";

import { CAN_PUBLISH_PROFILE } from "@/lib/billing/entitlementKeys";
import { prisma } from "@/lib/prisma";
import { autoUnpublishIfNoEntitlement } from "@/lib/profile/publishing";

export type SyncSummary = {
  usersChecked: number;
  expiredMarked: number;
  entitlementsGranted: number;
  entitlementsRevoked: number;
  profilesUnpublished: number;
};

const ACTIVE_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.active,
  SubscriptionStatus.renewing,
]);

async function syncUserInternal(
  tx: Prisma.TransactionClient,
  userId: string,
  now: Date,
): Promise<{
  entitlementsGranted: number;
  entitlementsRevoked: number;
  profilesUnpublished: number;
}> {
  let entitlementsGranted = 0;
  let entitlementsRevoked = 0;
  let profilesUnpublished = 0;

  const subscription = await tx.subscription.findUnique({
    where: { userId },
    select: {
      id: true,
      status: true,
      endsAt: true,
    },
  });

  const entitlement = await tx.userEntitlement.findFirst({
    where: {
      userId,
      key: CAN_PUBLISH_PROFILE,
    },
    orderBy: { expiresAt: "desc" },
    select: {
      id: true,
      expiresAt: true,
    },
  });

  const hasSubscription = !!subscription;
  const status = subscription?.status ?? null;
  const isActiveSubscription =
    hasSubscription && status && ACTIVE_STATUSES.has(status);
  const entitlementActive =
    !!entitlement && (!entitlement.expiresAt || entitlement.expiresAt > now);

  if (isActiveSubscription && subscription) {
    const targetExpiry = subscription.endsAt;

    if (!entitlement) {
      await tx.userEntitlement.create({
        data: {
          userId,
          key: CAN_PUBLISH_PROFILE,
          expiresAt: targetExpiry,
        },
      });
      entitlementsGranted += 1;
    } else if (!entitlementActive) {
      await tx.userEntitlement.update({
        where: { id: entitlement.id },
        data: { expiresAt: targetExpiry },
      });
      entitlementsGranted += 1;
    } else if (
      !entitlement.expiresAt ||
      entitlement.expiresAt.getTime() !== targetExpiry.getTime()
    ) {
      await tx.userEntitlement.update({
        where: { id: entitlement.id },
        data: { expiresAt: targetExpiry },
      });
    }
  } else {
    if (entitlementActive && entitlement) {
      await tx.userEntitlement.update({
        where: { id: entitlement.id },
        data: { expiresAt: new Date(now) },
      });
      entitlementsRevoked += 1;
    }

    const unpublished = await autoUnpublishIfNoEntitlement(userId, tx);
    if (unpublished) {
      profilesUnpublished += 1;
    }
  }

  return { entitlementsGranted, entitlementsRevoked, profilesUnpublished };
}

export async function syncSingleUser(
  userId: string,
  now = new Date(),
): Promise<{
  entitlementsGranted: number;
  entitlementsRevoked: number;
  profilesUnpublished: number;
}> {
  return prisma.$transaction((tx) => syncUserInternal(tx, userId, now));
}

export async function syncAllSubscriptions(now = new Date()): Promise<SyncSummary> {
  const summary: SyncSummary = {
    usersChecked: 0,
    expiredMarked: 0,
    entitlementsGranted: 0,
    entitlementsRevoked: 0,
    profilesUnpublished: 0,
  };

  const staleSubscriptions = await prisma.subscription.findMany({
    where: {
      endsAt: { lt: now },
      status: { not: SubscriptionStatus.expired },
    },
    select: { id: true, userId: true },
  });

  if (staleSubscriptions.length > 0) {
    await prisma.subscription.updateMany({
      where: { id: { in: staleSubscriptions.map((record) => record.id) } },
      data: { status: SubscriptionStatus.expired },
    });
    summary.expiredMarked = staleSubscriptions.length;
  }

  const [subscriptions, entitlementUsers] = await Promise.all([
    prisma.subscription.findMany({ select: { userId: true } }),
    prisma.userEntitlement.findMany({
      where: { key: CAN_PUBLISH_PROFILE },
      select: { userId: true },
    }),
  ]);

  const users = new Set<string>();
  for (const record of subscriptions) {
    users.add(record.userId);
  }
  for (const record of entitlementUsers) {
    users.add(record.userId);
  }

  for (const userId of users) {
    summary.usersChecked += 1;
    const result = await prisma.$transaction((tx) =>
      syncUserInternal(tx, userId, now),
    );
    summary.entitlementsGranted += result.entitlementsGranted;
    summary.entitlementsRevoked += result.entitlementsRevoked;
    summary.profilesUnpublished += result.profilesUnpublished;
  }

  return summary;
}

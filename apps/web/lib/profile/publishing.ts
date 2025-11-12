import { PrismaClient, Prisma, ProfileVisibility } from "@prisma/client";

import { CAN_PUBLISH_PROFILE } from "@/lib/billing/entitlementKeys";
import { prisma } from "@/lib/prisma";

export type PrismaLike = PrismaClient | Prisma.TransactionClient;

export async function autoUnpublishIfNoEntitlement(
  userId: string,
  client: PrismaLike = prisma,
): Promise<boolean> {
  const now = new Date();

  const entitlement = await client.userEntitlement.findFirst({
    where: {
      userId,
      key: CAN_PUBLISH_PROFILE,
    },
    orderBy: { expiresAt: "desc" },
    select: { expiresAt: true },
  });

  const hasActiveEntitlement =
    !!entitlement && (!entitlement.expiresAt || entitlement.expiresAt > now);

  if (hasActiveEntitlement) {
    return false;
  }

  const profile = await client.profile.findUnique({
    where: { userId },
    select: {
      visibility: true,
    },
  });

  if (!profile) {
    return false;
  }

  if (profile.visibility === ProfileVisibility.PRIVATE) {
    return false;
  }

  await client.profile.update({
    where: { userId },
    data: {
      visibility: ProfileVisibility.PRIVATE,
      publishedAt: null,
    },
  });

  return true;
}

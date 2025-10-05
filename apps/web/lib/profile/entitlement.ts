import { CAN_PUBLISH_PROFILE } from "@/lib/billing/entitlementKeys";
import { prisma } from "@/lib/prisma";

export async function canPublishProfile(userId: string): Promise<boolean> {
  const entitlement = await prisma.userEntitlement.findUnique({
    where: {
      userId_key: {
        userId,
        key: CAN_PUBLISH_PROFILE,
      },
    },
    select: {
      expiresAt: true,
    },
  });

  if (!entitlement) {
    return false;
  }

  if (!entitlement.expiresAt) {
    return true;
  }

  return entitlement.expiresAt > new Date();
}

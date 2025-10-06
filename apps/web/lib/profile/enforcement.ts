import { revalidatePath } from "next/cache";

import { CAN_PUBLISH_PROFILE } from "@/lib/billing/entitlementKeys";
import { prisma } from "@/lib/prisma";
import {
  emitEntitlementExpired,
  emitEntitlementRestored,
  emitSystemAutoUnpublish,
} from "@/lib/notifications/events";

type PublishabilityReason = "NO_ENTITLEMENT" | "ENTITLEMENT_EXPIRED";

type PublishabilityResult = {
  canPublish: boolean;
  reason?: PublishabilityReason;
};

async function revalidateProfilePaths(profileId: string) {
  const paths = ["/profiles", `/profiles/${profileId}`, "/dashboard/profile"];

  for (const path of paths) {
    try {
      await revalidatePath(path);
    } catch (error) {
      console.warn("[enforcement] revalidate_failed", {
        path,
        error,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export async function getPublishability(userId: string): Promise<PublishabilityResult> {
  const now = new Date();
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

  let result: PublishabilityResult;

  if (!entitlement) {
    result = { canPublish: false, reason: "NO_ENTITLEMENT" };
  } else if (entitlement.expiresAt && entitlement.expiresAt <= now) {
    result = { canPublish: false, reason: "ENTITLEMENT_EXPIRED" };
  } else {
    result = { canPublish: true };
  }

  console.info("[enforcement] check", {
    userId,
    canPublish: result.canPublish,
    reason: result.reason,
    timestamp: now.toISOString(),
  });

  return result;
}

export async function enforceUserProfileVisibility(
  userId: string,
): Promise<"unchanged" | "auto_unpublished" | "auto_published"> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: {
      id: true,
      visibility: true,
      publishedAt: true,
      moderationStatus: true,
    },
  });

  if (!profile) {
    return "unchanged";
  }

  const publishability = await getPublishability(userId);

  if (profile.visibility === "PUBLIC" && !publishability.canPublish) {
    await prisma.profile.update({
      where: { userId },
      data: {
        visibility: "PRIVATE",
      },
    });

    await prisma.moderationEvent.create({
      data: {
        profileId: profile.id,
        actorId: null,
        action: "SYSTEM_AUTO_UNPUBLISH",
        reason: publishability.reason ?? "NOT_APPROVED",
      },
    });

    await revalidateProfilePaths(profile.id);

    await emitSystemAutoUnpublish(
      userId,
      profile.id,
      publishability.reason ?? "NOT_APPROVED",
    );

    if (publishability.reason === "ENTITLEMENT_EXPIRED") {
      await emitEntitlementExpired(userId);
    }

    console.info("[enforcement] auto_unpublished", {
      userId,
      profileId: profile.id,
      reason: publishability.reason ?? "NOT_APPROVED",
      timestamp: new Date().toISOString(),
    });

    return "auto_unpublished";
  }

  if (
    profile.visibility === "PRIVATE" &&
    publishability.canPublish &&
    profile.moderationStatus === "APPROVED" &&
    profile.publishedAt
  ) {
    await prisma.profile.update({
      where: { userId },
      data: {
        visibility: "PUBLIC",
        publishedAt: new Date(),
      },
    });

    await revalidateProfilePaths(profile.id);

    await emitEntitlementRestored(userId);

    console.info("[enforcement] auto_published", {
      userId,
      profileId: profile.id,
      timestamp: new Date().toISOString(),
    });

    return "auto_published";
  }

  return "unchanged";
}

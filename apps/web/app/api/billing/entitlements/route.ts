import { NextRequest } from "next/server";

import { CAN_PUBLISH_PROFILE, JOB_POST_CREDIT } from "@/lib/billing/entitlementKeys";
import { prisma } from "@/lib/db";
import { badRequest, getQuery, ok } from "@/lib/http";

export async function GET(request: NextRequest) {
  const userId = getQuery(request, "userId");

  if (!userId) {
    return badRequest("Missing userId");
  }

  const entitlements = await prisma.userEntitlement.findMany({
    where: {
      userId,
      key: {
        in: [CAN_PUBLISH_PROFILE, JOB_POST_CREDIT],
      },
    },
    select: {
      key: true,
      expiresAt: true,
      remainingCredits: true,
    },
  });

  type EntitlementResult = (typeof entitlements)[number];

  let canPublish: EntitlementResult | undefined;
  let jobCredit: EntitlementResult | undefined;

  for (const entitlement of entitlements) {
    if (entitlement.key === CAN_PUBLISH_PROFILE) {
      canPublish = entitlement;
    } else if (entitlement.key === JOB_POST_CREDIT) {
      jobCredit = entitlement;
    }
  }

  return ok({
    userId,
    can_publish_profile: canPublish
      ? {
          status: canPublish.expiresAt && canPublish.expiresAt > new Date() ? "active" : "inactive",
          expiresAt: canPublish.expiresAt?.toISOString() ?? null,
        }
      : {
          status: "inactive",
          expiresAt: null,
        },
    job_post_credit: {
      remainingCredits: jobCredit?.remainingCredits ?? 0,
    },
  });
}
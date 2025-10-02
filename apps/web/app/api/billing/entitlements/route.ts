import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { CAN_PUBLISH_PROFILE, JOB_POST_CREDIT } from "@/lib/billing/entitlementKeys";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
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

  const canPublish = entitlements.find((item) => item.key === CAN_PUBLISH_PROFILE);
  const jobCredit = entitlements.find((item) => item.key === JOB_POST_CREDIT);

  return NextResponse.json({
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
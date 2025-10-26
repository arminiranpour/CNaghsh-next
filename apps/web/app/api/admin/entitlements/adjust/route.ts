import { NextRequest } from "next/server";
import { z } from "zod";

import { findAdminUser } from "@/lib/admin/ensureAdmin";
import { CAN_PUBLISH_PROFILE } from "@/lib/billing/entitlementKeys";
import { syncSingleUser } from "@/lib/billing/entitlementSync";
import { badRequest, ok, unauthorized } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  userId: z.string().cuid(),
  action: z.enum(["grant", "revoke"]),
  key: z.literal(CAN_PUBLISH_PROFILE),
  expiresAt: z.string().datetime().optional(),
  reason: z.string().min(3),
});

export async function POST(request: NextRequest) {
  const admin = await findAdminUser(request);
  if (!admin) {
    return unauthorized("Admin required");
  }

  const payload = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!payload.success) {
    return badRequest("Invalid payload");
  }

  const { userId, action, expiresAt } = payload.data;
  const targetDate = expiresAt ? new Date(expiresAt) : null;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const existing = await tx.userEntitlement.findFirst({
      where: { userId, key: CAN_PUBLISH_PROFILE },
      orderBy: { updatedAt: "desc" },
    });

    if (action === "grant") {
      if (existing) {
        await tx.userEntitlement.update({
          where: { id: existing.id },
          data: { expiresAt: targetDate },
        });
      } else {
        await tx.userEntitlement.create({
          data: {
            userId,
            key: CAN_PUBLISH_PROFILE,
            expiresAt: targetDate,
          },
        });
      }
    } else if (existing) {
      await tx.userEntitlement.update({
        where: { id: existing.id },
        data: { expiresAt: now },
      });
    }
  });

  await syncSingleUser(userId);

  const entitlements = await prisma.userEntitlement.findMany({
    where: { userId, key: CAN_PUBLISH_PROFILE },
    orderBy: { updatedAt: "desc" },
  });

  return ok({ userId, entitlements });
}

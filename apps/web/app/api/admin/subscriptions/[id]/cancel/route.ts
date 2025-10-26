import { NextRequest } from "next/server";
import { z } from "zod";

import { ensureAdmin } from "@/lib/admin/ensureAdmin";
import { badRequest, notFound, ok, unauthorized } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { syncSingleUser } from "@/lib/billing/entitlementSync";
import { markExpired } from "@/lib/billing/subscriptionService";

const paramsSchema = z.object({ id: z.string().cuid() });

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await ensureAdmin(request);
  if (!admin) {
    return unauthorized("Admin required");
  }

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return badRequest("Invalid subscription id");
  }

  const subscription = await prisma.subscription.findUnique({
    where: { id: parsedParams.data.id },
    include: { plan: true },
  });

  if (!subscription) {
    return notFound("Subscription not found");
  }

  await markExpired({ userId: subscription.userId });
  await syncSingleUser(subscription.userId);

  const updated = await prisma.subscription.findUnique({
    where: { id: subscription.id },
    include: {
      plan: true,
      user: { select: { id: true, email: true, name: true } },
    },
  });

  return ok({ subscription: updated });
}

import { NextRequest } from "next/server";
import { z } from "zod";

import { getServerAuthSession } from "@/lib/auth/session";
import { badRequest, notFound, ok, unauthorized } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { syncSingleUser } from "@/lib/billing/entitlementSync";
import { markExpired } from "@/lib/billing/subscriptionService";

const paramsSchema = z.object({ id: z.string().cuid() });

async function ensureAdmin(request: NextRequest) {
  const session = await getServerAuthSession();
  if (session?.user && session.user.role === "ADMIN") {
    return session.user;
  }

  const adminId = request.headers.get("x-admin-user-id");
  if (adminId) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, role: true },
    });
    if (admin?.role === "ADMIN") {
      return admin;
    }
  }

  return null;
}

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

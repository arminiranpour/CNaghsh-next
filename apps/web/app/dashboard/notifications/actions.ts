"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const idSchema = z.string().cuid();

async function requireUserId(): Promise<string> {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    throw new Error("برای انجام این عملیات ابتدا وارد شوید.");
  }

  return session.user.id;
}

async function revalidateNotificationViews() {
  await Promise.all([
    revalidatePath("/dashboard/notifications"),
    revalidatePath("/dashboard", "layout"),
  ]);
}

export async function markAllRead(): Promise<{ ok: boolean }> {
  const userId = await requireUserId();

  await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  await revalidateNotificationViews();

  return { ok: true };
}

export async function markOneRead(id: string): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const notificationId = idSchema.parse(id);

  const existing = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { userId: true, readAt: true },
  });

  if (!existing || existing.userId !== userId) {
    throw new Error("اعلان یافت نشد.");
  }

  if (!existing.readAt) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  await revalidateNotificationViews();

  return { ok: true };
}

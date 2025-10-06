import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

const VIEW_COOKIE_PREFIX = "job-viewed";
const VIEW_DEBOUNCE_MS = 30 * 60 * 1000; // 30 minutes

function buildCookieName(jobId: string): string {
  return `${VIEW_COOKIE_PREFIX}-${jobId}`;
}

export async function incrementJobViews(jobId: string): Promise<void> {
  if (!jobId) {
    return;
  }

  const cookieStore = cookies();
  const cookieName = buildCookieName(jobId);
  const now = Date.now();
  const existing = cookieStore.get(cookieName);

  if (existing) {
    const lastViewed = Number.parseInt(existing.value, 10);
    if (!Number.isNaN(lastViewed) && now - lastViewed < VIEW_DEBOUNCE_MS) {
      return;
    }
  }

  cookieStore.set({
    name: cookieName,
    value: String(now),
    httpOnly: true,
    sameSite: "lax",
    maxAge: Math.floor(VIEW_DEBOUNCE_MS / 1000),
  });

  try {
    await prisma.job.update({
      where: { id: jobId },
      data: { views: { increment: 1 } },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to increment job views", { jobId, error });
    }
  }
}

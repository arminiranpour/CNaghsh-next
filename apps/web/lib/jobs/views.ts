import { prisma } from "@/lib/prisma";

export async function incrementJobViews(jobId: string): Promise<void> {
  if (!jobId) {
    return;
  }

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

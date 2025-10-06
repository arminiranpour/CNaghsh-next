import { JobStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  JobAccessDeniedError,
  JobNotFoundError,
  JobStatusError,
} from "./errors";
import { revalidateJobRelatedPaths } from "./revalidate";

export async function closeJob(userId: string, jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { userId: true, status: true },
  });

  if (!job) {
    throw new JobNotFoundError();
  }

  if (job.userId !== userId) {
    throw new JobAccessDeniedError();
  }

  if (job.status !== JobStatus.PUBLISHED) {
    throw new JobStatusError("فقط آگهی‌های منتشرشده قابل بستن هستند.");
  }

  const updated = await prisma.job.update({
    where: { id: jobId },
    data: { status: JobStatus.CLOSED },
  });

  await revalidateJobRelatedPaths(updated.id);

  return updated;
}

import { JobModeration, JobStatus } from "@prisma/client";

import { consumeJobCreditTx, onJobCreditConsumed } from "@/lib/entitlements/jobs";
import { prisma } from "@/lib/prisma";

import {
  JobAccessDeniedError,
  JobNotFoundError,
  JobStatusError,
} from "./errors";
import { revalidateJobRelatedPaths } from "./revalidate";

export async function republishJob(userId: string, jobId: string) {
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

  if (job.status !== JobStatus.CLOSED) {
    throw new JobStatusError("فقط آگهی‌های بسته قابل بازنشر هستند.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    await consumeJobCreditTx(userId, tx);

    const result = await tx.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.PUBLISHED,
        moderation: JobModeration.PENDING,
      },
    });

    return result;
  });

  onJobCreditConsumed(userId, updated.id);

  await revalidateJobRelatedPaths(updated.id);

  return updated;
}

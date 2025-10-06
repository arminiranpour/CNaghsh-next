"use server";

import { JobStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { revalidateJobRelatedPaths } from "@/lib/jobs/revalidate";
import { emitJobClosed } from "@/lib/notifications/events";

import {
  JOB_ADMIN_SELECT,
  JobAdminAction,
  buildJobNotificationInfo,
  getJobForAdmin,
} from "./common";

export async function closeJobByAdmin(jobId: string, adminId: string) {
  const job = await getJobForAdmin(jobId);

  if (job.status === JobStatus.CLOSED) {
    return job;
  }

  const [updated] = await prisma.$transaction([
    prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.CLOSED },
      select: JOB_ADMIN_SELECT,
    }),
    prisma.jobModerationEvent.create({
      data: {
        jobId,
        adminId,
        action: JobAdminAction.CLOSE,
        note: null,
      },
    }),
  ]);

  await revalidateJobRelatedPaths(jobId);

  await emitJobClosed(buildJobNotificationInfo(updated));

  return updated;
}

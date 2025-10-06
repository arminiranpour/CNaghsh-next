"use server";

import { JobModeration } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { revalidateJobRelatedPaths } from "@/lib/jobs/revalidate";
import { emitJobApproved } from "@/lib/notifications/events";

import {
  JOB_ADMIN_SELECT,
  JobAdminAction,
  prismaWithJobModeration,
  buildJobNotificationInfo,
  ensureModerationTransition,
  getJobForAdmin,
} from "./common";

export async function approveJobAdmin(jobId: string, adminId: string) {
  const job = await getJobForAdmin(jobId);

  if (job.moderation === JobModeration.APPROVED) {
    return job;
  }

  ensureModerationTransition(
    job.moderation,
    [JobModeration.PENDING, JobModeration.REJECTED, JobModeration.SUSPENDED],
    JobModeration.APPROVED,
  );

  const [updated] = await prisma.$transaction([
    prisma.job.update({
      where: { id: jobId },
      data: { moderation: JobModeration.APPROVED },
      select: JOB_ADMIN_SELECT,
    }),
    prismaWithJobModeration.jobModerationEvent.create({
      data: {
        jobId,
        adminId,
        action: JobAdminAction.APPROVE,
        note: null,
      },
    }),
  ]);

  await revalidateJobRelatedPaths(jobId);

  await emitJobApproved(buildJobNotificationInfo(updated));

  return updated;
}

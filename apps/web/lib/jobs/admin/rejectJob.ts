"use server";

import { JobModeration } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { revalidateJobRelatedPaths } from "@/lib/jobs/revalidate";
import { emitJobRejected } from "@/lib/notifications/events";

import {
  JOB_ADMIN_SELECT,
  JobAdminAction,
  buildJobNotificationInfo,
  ensureModerationTransition,
  getJobForAdmin,
  prismaWithJobModeration,
} from "./common";

export async function rejectJobAdmin(jobId: string, adminId: string, note?: string | null) {
  const job = await getJobForAdmin(jobId);

  const cleanedNote = note?.trim() ? note.trim() : null;

  if (job.moderation === JobModeration.REJECTED && cleanedNote === null) {
    return job;
  }

  ensureModerationTransition(
    job.moderation,
    [JobModeration.PENDING, JobModeration.APPROVED, JobModeration.SUSPENDED],
    JobModeration.REJECTED,
  );

  const [updated] = await prisma.$transaction([
    prisma.job.update({
      where: { id: jobId },
      data: { moderation: JobModeration.REJECTED },
      select: JOB_ADMIN_SELECT,
    }),
    prismaWithJobModeration.jobModerationEvent.create({
      data: {
        jobId,
        adminId,
        action: JobAdminAction.REJECT,
        note: cleanedNote,
      },
    }),
  ]);

  await revalidateJobRelatedPaths(jobId);

  await emitJobRejected({
    ...buildJobNotificationInfo(updated),
    note: cleanedNote ?? undefined,
  });

  return updated;
}

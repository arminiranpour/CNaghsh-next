"use server";

import { JobModeration } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { revalidateJobRelatedPaths } from "@/lib/jobs/revalidate";
import { emitJobPending } from "@/lib/notifications/events";

import {
  JOB_ADMIN_SELECT,
  JobAdminAction,
  buildJobNotificationInfo,
  ensureModerationTransition,
  getJobForAdmin,
} from "./common";

export async function suspendJobAdmin(jobId: string, adminId: string, note?: string | null) {
  const job = await getJobForAdmin(jobId);

  const cleanedNote = note?.trim() ? note.trim() : null;

  if (job.moderation === JobModeration.SUSPENDED && !cleanedNote) {
    return job;
  }

  ensureModerationTransition(
    job.moderation,
    [JobModeration.PENDING, JobModeration.APPROVED, JobModeration.REJECTED],
    JobModeration.SUSPENDED,
  );

  const [updated] = await prisma.$transaction([
    prisma.job.update({
      where: { id: jobId },
      data: { moderation: JobModeration.SUSPENDED },
      select: JOB_ADMIN_SELECT,
    }),
    prisma.jobModerationEvent.create({
      data: {
        jobId,
        adminId,
        action: JobAdminAction.SUSPEND,
        note: cleanedNote,
      },
    }),
  ]);

  await revalidateJobRelatedPaths(jobId);

  await emitJobPending({
    ...buildJobNotificationInfo(updated),
    action: "SUSPENDED",
    note: cleanedNote ?? undefined,
  });

  return updated;
}

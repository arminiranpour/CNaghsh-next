"use server";

import { prisma } from "@/lib/prisma";
import { revalidateJobRelatedPaths } from "@/lib/jobs/revalidate";
import { emitJobFeatured, emitJobUnfeatured } from "@/lib/notifications/events";

import {
  JOB_ADMIN_SELECT,
  InvalidFeatureScheduleError,
  JobAdminAction,
  buildJobNotificationInfo,
  getJobForAdmin,
  isJobFeatured,
  prismaWithJobModeration,
} from "./common";

export type FeatureJobCommand =
  | { type: "PRESET"; days: number }
  | { type: "CUSTOM"; until: Date }
  | { type: "CLEAR" };

const MAX_CUSTOM_DAYS = 60;

function getCustomDateTarget(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

export async function featureJobAdmin(jobId: string, adminId: string, command: FeatureJobCommand) {
  const job = await getJobForAdmin(jobId);
  const now = new Date();

  let nextFeaturedUntil: Date | null = job.featuredUntil ?? null;
  let action: JobAdminAction = JobAdminAction.FEATURE;

  if (command.type === "CLEAR") {
    if (!isJobFeatured(job, now)) {
      return job;
    }
    nextFeaturedUntil = null;
    action = JobAdminAction.UNFEATURE;
  } else if (command.type === "PRESET") {
    if (!Number.isFinite(command.days) || command.days <= 0) {
      throw new InvalidFeatureScheduleError();
    }
    const base = isJobFeatured(job, now) && job.featuredUntil ? job.featuredUntil : now;
    const baseDate = new Date(base);
    baseDate.setDate(baseDate.getDate() + command.days);
    nextFeaturedUntil = baseDate;
    action = JobAdminAction.FEATURE;
  } else if (command.type === "CUSTOM") {
    const target = getCustomDateTarget(command.until);
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (target <= now) {
      throw new InvalidFeatureScheduleError("تاریخ انتخاب شده باید در آینده باشد.");
    }

    if (diffDays > MAX_CUSTOM_DAYS) {
      throw new InvalidFeatureScheduleError("حداکثر می‌توانید تا ۶۰ روز آینده ویژه کنید.");
    }

    nextFeaturedUntil = target;
    action = JobAdminAction.FEATURE;
  }

  const previousValue = job.featuredUntil ? job.featuredUntil.getTime() : null;
  const nextValue = nextFeaturedUntil ? nextFeaturedUntil.getTime() : null;

  if (previousValue === nextValue) {
    return job;
  }

  const [updated] = await prisma.$transaction([
    prisma.job.update({
      where: { id: jobId },
      data: { featuredUntil: nextFeaturedUntil },
      select: JOB_ADMIN_SELECT,
    }),
    prismaWithJobModeration.jobModerationEvent.create({
      data: {
        jobId,
        adminId,
        action,
        note: null,
      },
    }),
  ]);

  await revalidateJobRelatedPaths(jobId);

  if (action === JobAdminAction.UNFEATURE) {
    await emitJobUnfeatured(buildJobNotificationInfo(updated));
  } else {
    await emitJobFeatured({
      ...buildJobNotificationInfo(updated),
      featuredUntil: updated.featuredUntil ?? null,
    });
  }

  return updated;
}

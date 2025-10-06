import { JobModeration, JobStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { JobNotFoundError } from "../errors";

export const JobAdminAction = {
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  SUSPEND: "SUSPEND",
  FEATURE: "FEATURE",
  UNFEATURE: "UNFEATURE",
  CLOSE: "CLOSE",
} as const;

export type JobAdminAction = (typeof JobAdminAction)[keyof typeof JobAdminAction];

type JobModerationEventData = {
  jobId: string;
  adminId: string;
  action: JobAdminAction;
  note: string | null;
};

type PrismaJobModerationClient = {
  jobModerationEvent: {
    create(args: { data: JobModerationEventData }): Promise<unknown>;
  };
};

export const prismaWithJobModeration = prisma as typeof prisma & PrismaJobModerationClient;

export class AdminActionForbiddenError extends Error {
  readonly code = "ADMIN_ACTION_FORBIDDEN" as const;

  constructor(message = "دسترسی به این عملیات مجاز نیست.") {
    super(message);
    this.name = "AdminActionForbiddenError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidModerationTransitionError extends Error {
  readonly code = "INVALID_MODERATION_TRANSITION" as const;

  constructor(message = "تغییر وضعیت مجاز نیست.") {
    super(message);
    this.name = "InvalidModerationTransitionError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidFeatureScheduleError extends Error {
  readonly code = "INVALID_FEATURE_SCHEDULE" as const;

  constructor(message = "زمان ویژه‌سازی معتبر نیست.") {
    super(message);
    this.name = "InvalidFeatureScheduleError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const JOB_ADMIN_SELECT = {
  id: true,
  userId: true,
  title: true,
  status: true,
  moderation: true,
  featuredUntil: true,
  createdAt: true,
} satisfies Prisma.JobSelect;

export type JobAdminSnapshot = Prisma.JobGetPayload<{ select: typeof JOB_ADMIN_SELECT }>;

export async function getJobForAdmin(jobId: string): Promise<JobAdminSnapshot> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: JOB_ADMIN_SELECT,
  });

  if (!job) {
    throw new JobNotFoundError("آگهی موردنظر پیدا نشد.");
  }

  return job;
}

export function isJobFeatured(job: { featuredUntil: Date | null }, referenceDate = new Date()): boolean {
  return Boolean(job.featuredUntil && job.featuredUntil.getTime() > referenceDate.getTime());
}

export type JobNotificationInfo = {
  userId: string;
  jobId: string;
  jobTitle: string;
  jobStatus: JobStatus;
};

export function buildJobNotificationInfo(job: JobAdminSnapshot): JobNotificationInfo {
  return {
    userId: job.userId,
    jobId: job.id,
    jobTitle: job.title,
    jobStatus: job.status,
  };
}

export function ensureModerationTransition(
  current: JobModeration,
  allowed: JobModeration[],
  target: JobModeration,
): void {
  if (current === target) {
    return;
  }

  if (!allowed.includes(current)) {
    throw new InvalidModerationTransitionError();
  }
}


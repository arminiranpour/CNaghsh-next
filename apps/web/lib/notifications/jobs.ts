import {
  NotificationChannel,
  NotificationDispatchStatus,
  NotificationJobStatus,
  NotificationType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { sendEmail, type EmailContent } from "./email";

export type NotificationJobPayload = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown> | null;
  dedupeKey: string;
  channel: NotificationChannel;
  email?: {
    content: EmailContent;
    to?: string;
  };
};

const MAX_BACKOFF_MINUTES = 60;

function computeBackoff(attempt: number): number {
  const baseMinutes = Math.pow(2, attempt - 1);
  return Math.min(baseMinutes, MAX_BACKOFF_MINUTES);
}

function isUniqueError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return true;
  }

  return (error as { code?: string }).code === "P2002";
}

export async function enqueueJob(logId: string, payload: NotificationJobPayload): Promise<string> {
  const job = await prisma.notificationJob.create({
    data: {
      logId,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  });

  const mode = process.env.NOTIFICATIONS_DELIVERY_MODE ?? "inline";
  if (mode !== "worker") {
    await processJob(job.id);
  }

  return job.id;
}

async function markLog(
  logId: string,
  data: Partial<{
    status: NotificationDispatchStatus;
    attempts: number;
    error: string | null;
    providerMessageId: string | null;
  }> & { lastAttemptAt?: Date },
) {
  await prisma.notificationMessageLog.update({
    where: { id: logId },
    data,
  });
}

async function completeJob(jobId: string) {
  await prisma.notificationJob.update({
    where: { id: jobId },
    data: {
      status: NotificationJobStatus.COMPLETED,
      error: null,
    },
  });
}

async function failJob(jobId: string, attempts: number, maxAttempts: number, error: string | null) {
  const now = new Date();
  if (attempts >= maxAttempts) {
    await prisma.notificationJob.update({
      where: { id: jobId },
      data: {
        status: NotificationJobStatus.FAILED,
        error,
      },
    });
    return;
  }

  const backoffMinutes = computeBackoff(attempts);
  const nextRun = new Date(now.getTime() + backoffMinutes * 60 * 1000);

  await prisma.notificationJob.update({
    where: { id: jobId },
    data: {
      status: NotificationJobStatus.PENDING,
      runAt: nextRun,
      error,
    },
  });
}

export async function processJob(jobId: string): Promise<void> {
  const job = await prisma.notificationJob.findUnique({
    where: { id: jobId },
    include: { messageLog: true },
  });

  if (!job) {
    return;
  }

  if (job.status !== NotificationJobStatus.PENDING) {
    return;
  }

  if (job.runAt > new Date()) {
    return;
  }

  const claimed = await prisma.notificationJob.updateMany({
    where: {
      id: job.id,
      status: NotificationJobStatus.PENDING,
      runAt: { lte: new Date() },
    },
    data: {
      status: NotificationJobStatus.PROCESSING,
      attempts: { increment: 1 },
    },
  });

  if (claimed.count === 0) {
    return;
  }

  const attempts = job.attempts + 1;
  const payload = job.payload as unknown as NotificationJobPayload;
  const now = new Date();

  await prisma.notificationMessageLog.update({
    where: { id: job.logId },
    data: {
      attempts,
      lastAttemptAt: now,
    },
  });

  try {
    if (payload.channel === NotificationChannel.IN_APP) {
      await prisma.notification.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          payload: payload.payload
            ? (payload.payload as Prisma.InputJsonValue)
            : undefined,
          channel: NotificationChannel.IN_APP,
          dedupeKey: payload.dedupeKey,
        },
      });

      await markLog(job.logId, {
        status: NotificationDispatchStatus.SENT,
        error: null,
      });
      await completeJob(job.id);
      return;
    }

    if (payload.channel === NotificationChannel.EMAIL) {
      if (!payload.email) {
        await markLog(job.logId, {
          status: NotificationDispatchStatus.SKIPPED,
          error: "EMAIL_TEMPLATE_MISSING",
        });
        await completeJob(job.id);
        return;
      }

      const result = await sendEmail({
        userId: payload.userId,
        to: payload.email.to,
        content: payload.email.content,
      });

      if (result.ok) {
        await markLog(job.logId, {
          status: NotificationDispatchStatus.SENT,
          error: null,
          providerMessageId: result.messageId ?? null,
        });
        await completeJob(job.id);
        return;
      }

      await markLog(job.logId, {
        status: NotificationDispatchStatus.QUEUED,
        error: result.error ?? null,
      });
      await failJob(job.id, attempts, job.maxAttempts, result.error ?? null);
      return;
    }

    await markLog(job.logId, {
      status: NotificationDispatchStatus.SKIPPED,
      error: "UNSUPPORTED_CHANNEL",
    });
    await completeJob(job.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    if (payload.channel === NotificationChannel.IN_APP && isUniqueError(error)) {
      await markLog(job.logId, {
        status: NotificationDispatchStatus.SENT,
        error: null,
      });
      await completeJob(job.id);
      return;
    }

    await markLog(job.logId, {
      status: NotificationDispatchStatus.QUEUED,
      error: message,
    });
    await failJob(job.id, attempts, job.maxAttempts, message);
  }
}

export async function processDueJobs(limit = 10): Promise<number> {
  const jobs = await prisma.notificationJob.findMany({
    where: {
      status: NotificationJobStatus.PENDING,
      runAt: { lte: new Date() },
    },
    orderBy: { runAt: "asc" },
    take: limit,
    select: { id: true },
  });

  for (const job of jobs) {
    await processJob(job.id);
  }

  return jobs.length;
}

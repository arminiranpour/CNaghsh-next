import { createHash } from "crypto";

import {
  NotificationChannel,
  NotificationDispatchStatus,
  NotificationType,
  Prisma,
} from "@prisma/client";

import { emitNotificationDispatch } from "./instrumentation";
import { enqueueJob, type NotificationJobPayload } from "./jobs";
import { prisma } from "@/lib/prisma";
import { buildManagePreferencesLink, isChannelEnabled, resolveCategoryForType } from "./preferences";
import type { EmailContent } from "./email";

export { setNotificationDispatchObserver } from "./instrumentation";
export type { NotificationDispatchObserver, NotificationDispatchEvent } from "./instrumentation";

type NotifyOptions = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown> | null;
  channels?: NotificationChannel[];
  dedupeKey: string;
  emailContent?: EmailContent | null;
  emailRecipient?: string | null;
};

function computeDedupeHash(userId: string, type: NotificationType, dedupeKey: string): string {
  const source = `${userId}:${type}:${dedupeKey}`;
  return createHash("sha256").update(source).digest("hex");
}

function isUniqueConstraint(error: unknown): boolean {
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

async function createLogEntry({
  userId,
  type,
  dedupeKey,
  channel,
  email,
  payload,
}: {
  userId: string;
  type: NotificationType;
  dedupeKey: string;
  channel: NotificationChannel;
  email?: string | null;
  payload?: Record<string, unknown> | null;
}) {
  return prisma.notificationMessageLog.create({
    data: {
      userId,
      email: email ?? null,
      eventType: type,
      channel,
      dedupeKey,
      status: NotificationDispatchStatus.QUEUED,
      metadata: payload ?? undefined,
    },
  });
}

export async function notifyOnce(options: NotifyOptions): Promise<void> {
  const {
    userId,
    type,
    title,
    body,
    payload,
    channels,
    dedupeKey,
    emailContent,
    emailRecipient,
  } = options;

  if (!dedupeKey || dedupeKey.trim().length === 0) {
    throw new Error("notifyOnce requires a non-empty dedupeKey");
  }

  const requestedChannels = channels?.length ? channels : [NotificationChannel.IN_APP];
  const category = resolveCategoryForType(type);
  const dedupeHash = computeDedupeHash(userId, type, dedupeKey);
  const manageLink = buildManagePreferencesLink(userId);

  for (const channel of requestedChannels) {
    const start = Date.now();
    let status: "queued" | "failed" | "duplicate" | "skipped" = "queued";
    let error: unknown;

    try {
      const allowed = await isChannelEnabled({
        userId,
        category,
        channel,
      });

      if (!allowed) {
        status = "skipped";
        try {
          await prisma.notificationMessageLog.create({
            data: {
              userId,
              eventType: type,
              channel,
              dedupeKey,
              status: NotificationDispatchStatus.SKIPPED,
              metadata: { reason: "PREFERENCE_DISABLED" },
            },
          });
        } catch (skipError) {
          if (!isUniqueConstraint(skipError)) {
            throw skipError;
          }
        }
        continue;
      }

      let log;
      try {
        log = await createLogEntry({
          userId,
          type,
          dedupeKey,
          channel,
          email: emailRecipient ?? null,
          payload,
        });
      } catch (creationError) {
        if (isUniqueConstraint(creationError)) {
          status = "duplicate";
          continue;
        }
        throw creationError;
      }

      const jobPayload: NotificationJobPayload = {
        userId,
        type,
        title,
        body,
        payload: payload ?? undefined,
        dedupeKey,
        channel,
      };

      if (channel === NotificationChannel.EMAIL && emailContent) {
        jobPayload.email = {
          content: { ...emailContent, manageLink },
          to: emailRecipient ?? undefined,
        };
      }

      await enqueueJob(log.id, jobPayload);
      status = "queued";
    } catch (dispatchError) {
      status = "failed";
      error = dispatchError;
      console.error("[notifications] dispatch_failed", {
        userId,
        type,
        channel,
        error: dispatchError,
      });
    } finally {
      emitNotificationDispatch({
        userId,
        type,
        channel,
        dedupeKey,
        dedupeHash,
        status,
        durationMs: Date.now() - start,
        ...(error ? { error } : {}),
      });
    }
  }
}

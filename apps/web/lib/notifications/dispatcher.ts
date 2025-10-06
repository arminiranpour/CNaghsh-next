import { createHash } from "crypto";

import { NotificationChannel, NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { isEmailConfigured, sendEmail } from "./email";
import { emitNotificationDispatch } from "./instrumentation";

export { setNotificationDispatchObserver } from "./instrumentation";
export type { NotificationDispatchObserver, NotificationDispatchEvent } from "./instrumentation";

type NotifyOptions = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown> | null;
  channels?: NotificationChannel[];
  dedupeKey?: string;
};

const TEN_MINUTES_MS = 10 * 60 * 1000;

function computeDedupeHash({
  userId,
  type,
  body,
  payload,
  dedupeKey,
}: {
  userId: string;
  type: NotificationType;
  body: string;
  payload?: Record<string, unknown> | null;
  dedupeKey?: string;
}): string {
  const payloadString = payload ? JSON.stringify(payload) : "";
  const fallback = dedupeKey ?? (payloadString.length > 0 ? payloadString : body);
  const source = `${userId}:${type}:${fallback}`;

  return createHash("sha256").update(source).digest("hex");
}

export async function notifyOnce(options: NotifyOptions): Promise<void> {
  const { userId, type, title, body, payload, channels, dedupeKey } = options;
  const requestedChannels = channels?.length ? channels : [NotificationChannel.IN_APP];
  const start = Date.now();
  const hash = computeDedupeHash({ userId, type, body, payload: payload ?? undefined, dedupeKey });
  let status: "delivered" | "duplicate" | "error" = "delivered";
  let dispatchError: unknown;

  try {
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type,
        createdAt: {
          gte: new Date(Date.now() - TEN_MINUTES_MS),
        },
        payload: {
          path: ["dedupeKey"],
          equals: hash,
        },
      },
    });

    if (existing) {
      status = "duplicate";
      return;
    }

    const notificationPayload = {
      ...(payload ?? {}),
      dedupeKey: hash,
      ...(dedupeKey ? { dedupeKeyRaw: dedupeKey } : {}),
    } satisfies Record<string, unknown>;

    if (requestedChannels.includes(NotificationChannel.IN_APP)) {
      await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          payload: notificationPayload,
          channel: NotificationChannel.IN_APP,
        },
      });
    }

    const shouldSendEmail =
      requestedChannels.includes(NotificationChannel.EMAIL) && isEmailConfigured();

    if (shouldSendEmail) {
      try {
        await sendEmail(userId, title, body);
      } catch (error) {
        dispatchError = error;
        status = "error";
        console.error("[notifications] email_failed", {
          userId,
          type,
          error,
        });
      }
    }
  } catch (error) {
    status = "error";
    dispatchError = error;
    throw error;
  } finally {
    emitNotificationDispatch({
      userId,
      type,
      channels: requestedChannels,
      dedupeKey,
      dedupeHash: hash,
      status,
      durationMs: Date.now() - start,
      ...(dispatchError ? { error: dispatchError } : {}),
    });
  }
}

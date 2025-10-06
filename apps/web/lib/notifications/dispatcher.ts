import { createHash } from "crypto";

import { NotificationChannel, NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { isEmailConfigured, sendEmail } from "./email";

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
  const hash = computeDedupeHash({ userId, type, body, payload: payload ?? undefined, dedupeKey });

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
    return;
  }

  const notificationPayload = {
    ...(payload ?? {}),
    dedupeKey: hash,
  } satisfies Record<string, unknown>;

  const requestedChannels = channels ?? [NotificationChannel.IN_APP, NotificationChannel.EMAIL];

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
      console.error("[notifications] email_failed", {
        userId,
        type,
        error,
      });
    }
  }
}

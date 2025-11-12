import { NotificationChannel } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { notifyOnce } from "./dispatcher";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractPayload(
  payload: unknown,
): { payload?: Record<string, unknown>; dedupeKey?: string } {
  if (!isRecord(payload)) {
    return {};
  }

  const result: Record<string, unknown> = {};
  let dedupeKey: string | undefined;

  for (const [key, value] of Object.entries(payload)) {
    if (key === "dedupeKeyRaw" && typeof value === "string") {
      dedupeKey = value;
      continue;
    }

    if (key === "dedupeKey") {
      continue;
    }

    result[key] = value;
  }

  return {
    payload: Object.keys(result).length > 0 ? result : undefined,
    dedupeKey,
  };
}

type ReplayOptions = {
  channels?: NotificationChannel[];
};

export async function replayNotifications(
  notificationIds: string[],
  options: ReplayOptions = {},
): Promise<void> {
  if (notificationIds.length === 0) {
    return;
  }

  const notifications = await prisma.notification.findMany({
    where: { id: { in: notificationIds } },
  });

  const byId = new Map(notifications.map((notification) => [notification.id, notification]));

  for (const id of notificationIds) {
    const notification = byId.get(id);
    if (!notification) {
      continue;
    }

    const { payload, dedupeKey } = extractPayload(notification.payload);
    const dedupeKeyValue = dedupeKey ?? notification.dedupeKey ?? notification.id;

    await notifyOnce({
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      payload,
      dedupeKey: dedupeKeyValue,
      channels: options.channels ?? [notification.channel ?? NotificationChannel.IN_APP],
    });
  }
}

import type { NotificationChannel, NotificationType } from "@prisma/client";

export type NotificationDispatchStatus = "delivered" | "duplicate" | "error";

export type NotificationDispatchEvent = {
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  dedupeKey?: string;
  dedupeHash: string;
  status: NotificationDispatchStatus;
  durationMs: number;
  error?: unknown;
};

export type NotificationDispatchObserver = (event: NotificationDispatchEvent) => void;

let observer: NotificationDispatchObserver | null = (event) => {
  const { status, ...rest } = event;
  const payload = {
    ...rest,
    status,
  };

  if (status === "error") {
    console.error("[notifications] dispatch_error", payload);
  } else if (status === "duplicate") {
    console.info("[notifications] dispatch_duplicate", payload);
  } else {
    console.info("[notifications] dispatch_delivered", payload);
  }
};

export function setNotificationDispatchObserver(
  nextObserver: NotificationDispatchObserver | null,
): void {
  observer = nextObserver;
}

export function getNotificationDispatchObserver(): NotificationDispatchObserver | null {
  return observer;
}

export function emitNotificationDispatch(event: NotificationDispatchEvent): void {
  try {
    observer?.(event);
  } catch (error) {
    console.error("[notifications] dispatch_observer_failed", { error });
  }
}

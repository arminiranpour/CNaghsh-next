import type { NotificationChannel, NotificationType } from "@prisma/client";

export type NotificationDispatchOutcome =
  | "queued"
  | "sent"
  | "failed"
  | "duplicate"
  | "skipped";

export type NotificationDispatchEvent = {
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  dedupeKey?: string;
  dedupeHash: string;
  status: NotificationDispatchOutcome;
  durationMs: number;
  error?: unknown;
};

export type NotificationDispatchObserver = (event: NotificationDispatchEvent) => void;

let observer: NotificationDispatchObserver | null = (event) => {
  const payload = { ...event };

  switch (event.status) {
    case "failed":
      console.error("[notifications] dispatch_failed", payload);
      break;
    case "duplicate":
      console.info("[notifications] dispatch_duplicate", payload);
      break;
    case "skipped":
      console.info("[notifications] dispatch_skipped", payload);
      break;
    case "sent":
      console.info("[notifications] dispatch_sent", payload);
      break;
    default:
      console.info("[notifications] dispatch_queued", payload);
      break;
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

import { NotificationChannel, NotificationType, type JobStatus } from "@prisma/client";

import { notifyOnce } from "./dispatcher";
import { getNotificationTemplate } from "./templates";

type BasePayload = Record<string, unknown> | undefined;

type DispatchArgs = {
  userId: string;
  type: NotificationType;
  payload?: BasePayload;
  dedupeKey: string;
  channels?: NotificationChannel[];
};

async function dispatchNotification({
  userId,
  type,
  payload,
  dedupeKey,
  channels,
}: DispatchArgs) {
  const template = getNotificationTemplate(type, payload);

  await notifyOnce({
    userId,
    type,
    title: template.title,
    body: template.body,
    payload: payload ?? undefined,
    dedupeKey,
    channels,
  });
}

export async function emitModerationApproved(userId: string, profileId: string) {
  await dispatchNotification({
    userId,
    type: NotificationType.MODERATION_APPROVED,
    payload: { profileId },
    dedupeKey: `${NotificationType.MODERATION_APPROVED}:${profileId}`,
  });
}

export async function emitModerationRejected(
  userId: string,
  profileId: string,
  reason: string,
) {
  const normalizedReason = reason.trim();
  await dispatchNotification({
    userId,
    type: NotificationType.MODERATION_REJECTED,
    payload: { profileId, reason: normalizedReason },
    dedupeKey: `${NotificationType.MODERATION_REJECTED}:${profileId}:${normalizedReason}`,
  });
}

export async function emitModerationPending(userId: string, profileId: string) {
  await dispatchNotification({
    userId,
    type: NotificationType.MODERATION_PENDING,
    payload: { profileId },
    dedupeKey: `${NotificationType.MODERATION_PENDING}:${profileId}`,
  });
}

export async function emitHidden(userId: string, profileId: string) {
  await dispatchNotification({
    userId,
    type: NotificationType.MODERATION_HIDDEN,
    payload: { profileId },
    dedupeKey: `${NotificationType.MODERATION_HIDDEN}:${profileId}`,
  });
}

export async function emitUnhidden(userId: string, profileId: string) {
  await dispatchNotification({
    userId,
    type: NotificationType.MODERATION_UNHIDDEN,
    payload: { profileId },
    dedupeKey: `${NotificationType.MODERATION_UNHIDDEN}:${profileId}`,
  });
}

export async function emitSystemAutoUnpublish(
  userId: string,
  profileId: string,
  reasonKey: string,
) {
  const normalizedReasonKey = reasonKey || "UNKNOWN";
  await dispatchNotification({
    userId,
    type: NotificationType.SYSTEM_AUTO_UNPUBLISH,
    payload: { profileId, reasonKey: normalizedReasonKey },
    dedupeKey: `${NotificationType.SYSTEM_AUTO_UNPUBLISH}:${profileId}:${normalizedReasonKey}`,
  });
}

export async function emitUserPublishSubmitted(userId: string, profileId: string) {
  await dispatchNotification({
    userId,
    type: NotificationType.USER_PUBLISH_SUBMITTED,
    payload: { profileId },
    dedupeKey: `${NotificationType.USER_PUBLISH_SUBMITTED}:${profileId}`,
  });
}

export async function emitUserUnpublished(userId: string, profileId: string) {
  await dispatchNotification({
    userId,
    type: NotificationType.USER_UNPUBLISHED,
    payload: { profileId },
    dedupeKey: `${NotificationType.USER_UNPUBLISHED}:${profileId}`,
  });
}

export async function emitEntitlementExpired(userId: string) {
  await dispatchNotification({
    userId,
    type: NotificationType.ENTITLEMENT_EXPIRED,
    payload: { entitlement: "CAN_PUBLISH_PROFILE" },
    dedupeKey: `${NotificationType.ENTITLEMENT_EXPIRED}:${userId}`,
  });
}

export async function emitEntitlementRestored(userId: string) {
  await dispatchNotification({
    userId,
    type: NotificationType.ENTITLEMENT_RESTORED,
    payload: { entitlement: "CAN_PUBLISH_PROFILE" },
    dedupeKey: `${NotificationType.ENTITLEMENT_RESTORED}:${userId}`,
  });
}

type JobNotificationPayload = {
  context: "job";
  jobId: string;
  jobTitle: string;
  jobStatus: JobStatus;
  action: string;
  note?: string;
  featuredUntil?: string | null;
};

function createJobPayload(
  base: Omit<JobNotificationPayload, "action">,
  action: JobNotificationPayload["action"],
  extra?: Partial<JobNotificationPayload>,
): JobNotificationPayload {
  return {
    ...base,
    action,
    ...extra,
  };
}

type JobNotificationBase = {
  userId: string;
  jobId: string;
  jobTitle: string;
  jobStatus: JobStatus;
};

export async function emitJobApproved({
  userId,
  jobId,
  jobTitle,
  jobStatus,
}: JobNotificationBase) {
  const payload = createJobPayload(
    { context: "job", jobId, jobTitle, jobStatus },
    "APPROVED",
  );

  await dispatchNotification({
    userId,
    type: NotificationType.MODERATION_APPROVED,
    payload,
    dedupeKey: `${NotificationType.MODERATION_APPROVED}:job:${jobId}:${jobStatus}`,
  });
}

export async function emitJobRejected({
  userId,
  jobId,
  jobTitle,
  jobStatus,
  note,
}: JobNotificationBase & { note?: string | null }) {
  const cleanedNote = note?.trim() ?? "";
  const payload = createJobPayload(
    { context: "job", jobId, jobTitle, jobStatus },
    "REJECTED",
    cleanedNote ? { note: cleanedNote } : undefined,
  );

  await dispatchNotification({
    userId,
    type: NotificationType.MODERATION_REJECTED,
    payload,
    dedupeKey: `${NotificationType.MODERATION_REJECTED}:job:${jobId}:${cleanedNote}`,
  });
}

export async function emitJobPending({
  userId,
  jobId,
  jobTitle,
  jobStatus,
  note,
  action,
}: JobNotificationBase & { action: "PENDING" | "SUSPENDED"; note?: string | null }) {
  const cleanedNote = note?.trim() ?? "";
  const payload = createJobPayload(
    { context: "job", jobId, jobTitle, jobStatus },
    action,
    cleanedNote ? { note: cleanedNote } : undefined,
  );

  await dispatchNotification({
    userId,
    type: NotificationType.MODERATION_PENDING,
    payload,
    dedupeKey: `${NotificationType.MODERATION_PENDING}:job:${jobId}:${action}:${cleanedNote}`,
  });
}

export async function emitJobFeatured({
  userId,
  jobId,
  jobTitle,
  jobStatus,
  featuredUntil,
}: JobNotificationBase & { featuredUntil: Date | null }) {
  const payload = createJobPayload(
    { context: "job", jobId, jobTitle, jobStatus },
    "FEATURED",
    { featuredUntil: featuredUntil ? featuredUntil.toISOString() : null },
  );

  await dispatchNotification({
    userId,
    type: NotificationType.MODERATION_PENDING,
    payload,
    dedupeKey: `${NotificationType.MODERATION_PENDING}:job:${jobId}:FEATURED:${payload.featuredUntil ?? "none"}`,
    channels: [NotificationChannel.IN_APP],
  });
}

export async function emitJobUnfeatured({
  userId,
  jobId,
  jobTitle,
  jobStatus,
}: JobNotificationBase) {
  const payload = createJobPayload(
    { context: "job", jobId, jobTitle, jobStatus },
    "UNFEATURED",
  );

  await dispatchNotification({
    userId,
    type: NotificationType.MODERATION_PENDING,
    payload,
    dedupeKey: `${NotificationType.MODERATION_PENDING}:job:${jobId}:UNFEATURED`,
    channels: [NotificationChannel.IN_APP],
  });
}

export async function emitJobClosed({
  userId,
  jobId,
  jobTitle,
  jobStatus,
}: JobNotificationBase) {
  const payload = createJobPayload(
    { context: "job", jobId, jobTitle, jobStatus },
    "CLOSED",
  );

  await dispatchNotification({
    userId,
    type: NotificationType.MODERATION_PENDING,
    payload,
    dedupeKey: `${NotificationType.MODERATION_PENDING}:job:${jobId}:CLOSED`,
    channels: [NotificationChannel.IN_APP],
  });
}

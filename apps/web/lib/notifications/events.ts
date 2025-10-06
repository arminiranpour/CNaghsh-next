import { NotificationType } from "@prisma/client";

import { notifyOnce } from "./dispatcher";
import { getNotificationTemplate } from "./templates";

type BasePayload = Record<string, unknown> | undefined;

type DispatchArgs = {
  userId: string;
  type: NotificationType;
  payload?: BasePayload;
  dedupeKey: string;
};

async function dispatchNotification({
  userId,
  type,
  payload,
  dedupeKey,
}: DispatchArgs) {
  const template = getNotificationTemplate(type, payload);

  await notifyOnce({
    userId,
    type,
    title: template.title,
    body: template.body,
    payload: payload ?? undefined,
    dedupeKey,
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

import { NotificationChannel, NotificationType, type JobStatus } from "@prisma/client";

import { notifyOnce } from "./dispatcher";
import { getNotificationTemplate } from "./templates";
import { buildAbsoluteUrl } from "@/lib/url";

const billingDashboardUrl = buildAbsoluteUrl("/dashboard/billing");
const billingHistoryUrl = buildAbsoluteUrl("/dashboard/billing?tab=history");
const defaultSupportMail = "mailto:support@cnaghsh.com";

type BasePayload = Record<string, unknown> | undefined;

type DispatchArgs = {
  userId: string;
  type: NotificationType;
  payload?: BasePayload;
  dedupeKey: string;
  channels?: NotificationChannel[];
  emailRecipient?: string | null;
};

async function dispatchNotification({
  userId,
  type,
  payload,
  dedupeKey,
  channels,
  emailRecipient,
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
    emailContent: template.email ?? undefined,
    emailRecipient: emailRecipient ?? undefined,
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

// Job state change notifications stay IN_APP-only until additional channels are supported.
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

export async function emitBillingSubscriptionRenewed({
  userId,
  subscriptionId,
  planName,
  endsAt,
  invoiceId,
  invoiceNumber,
}: {
  userId: string;
  subscriptionId: string;
  planName?: string | null;
  endsAt: Date;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
}) {
  const endsIso = endsAt.toISOString();
  const invoiceUrl = invoiceId ? buildAbsoluteUrl(`/api/invoices/${invoiceId}/pdf`) : billingHistoryUrl;

  await dispatchNotification({
    userId,
    type: NotificationType.BILLING_SUBSCRIPTION_RENEWED,
    payload: {
      subscriptionId,
      planName,
      endsAt: endsIso,
      invoiceId,
      invoiceNumber,
      invoiceUrl,
      manageUrl: billingDashboardUrl,
    },
    dedupeKey: `${NotificationType.BILLING_SUBSCRIPTION_RENEWED}:${subscriptionId}:${invoiceId ?? endsIso}`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  });
}

export async function emitBillingExpiryReminder({
  userId,
  subscriptionId,
  endsAt,
  reminderDate,
  renewUrl,
  impactNote,
}: {
  userId: string;
  subscriptionId: string;
  endsAt: Date;
  reminderDate: Date;
  renewUrl?: string;
  impactNote?: string | null;
}) {
  const reminderKey = reminderDate.toISOString().slice(0, 10);
  await dispatchNotification({
    userId,
    type: NotificationType.BILLING_SUBSCRIPTION_EXPIRY_REMINDER,
    payload: {
      subscriptionId,
      endsAt: endsAt.toISOString(),
      reminderDate: reminderKey,
      renewUrl: renewUrl ?? billingDashboardUrl,
      impactNote: impactNote ?? undefined,
    },
    dedupeKey: `${NotificationType.BILLING_SUBSCRIPTION_EXPIRY_REMINDER}:${subscriptionId}:${reminderKey}`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  });
}

export async function emitBillingSubscriptionExpired({
  userId,
  subscriptionId,
  expiredAt,
  renewUrl,
}: {
  userId: string;
  subscriptionId: string;
  expiredAt: Date;
  renewUrl?: string;
}) {
  const expiredIso = expiredAt.toISOString();
  await dispatchNotification({
    userId,
    type: NotificationType.BILLING_SUBSCRIPTION_EXPIRED,
    payload: {
      subscriptionId,
      expiredAt: expiredIso,
      renewUrl: renewUrl ?? billingDashboardUrl,
    },
    dedupeKey: `${NotificationType.BILLING_SUBSCRIPTION_EXPIRED}:${subscriptionId}:${expiredIso}`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  });
}

export async function emitBillingPaymentFailed({
  userId,
  paymentId,
  amount,
  providerLabel,
  reference,
  retryUrl,
  supportUrl,
}: {
  userId: string;
  paymentId: string;
  amount: number;
  providerLabel?: string | null;
  reference?: string | null;
  retryUrl?: string | null;
  supportUrl?: string | null;
}) {
  await dispatchNotification({
    userId,
    type: NotificationType.BILLING_PAYMENT_FAILED,
    payload: {
      paymentId,
      amount,
      providerLabel: providerLabel ?? undefined,
      referenceMasked: reference ?? undefined,
      retryUrl: retryUrl ?? billingDashboardUrl,
      supportUrl: supportUrl ?? defaultSupportMail,
    },
    dedupeKey: `${NotificationType.BILLING_PAYMENT_FAILED}:${paymentId}`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  });
}

export async function emitBillingRefundIssued({
  userId,
  refundInvoiceId,
  refundInvoiceNumber,
  amount,
  originalInvoiceNumber,
  policyNote,
}: {
  userId: string;
  refundInvoiceId: string;
  refundInvoiceNumber: string | null;
  amount: number;
  originalInvoiceNumber?: string | null;
  policyNote?: string | null;
}) {
  const pdfUrl = buildAbsoluteUrl(`/api/invoices/${refundInvoiceId}/pdf`);

  await dispatchNotification({
    userId,
    type: NotificationType.BILLING_REFUND_ISSUED,
    payload: {
      invoiceId: refundInvoiceId,
      invoiceNumber: refundInvoiceNumber,
      amount,
      originalInvoiceNumber: originalInvoiceNumber ?? undefined,
      pdfUrl,
      policyNote: policyNote ?? undefined,
    },
    dedupeKey: `${NotificationType.BILLING_REFUND_ISSUED}:${refundInvoiceId}`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  });
}

export async function emitBillingCancelImmediate({
  userId,
  subscriptionId,
  endedAt,
}: {
  userId: string;
  subscriptionId: string;
  endedAt: Date;
}) {
  const endedIso = endedAt.toISOString();
  await dispatchNotification({
    userId,
    type: NotificationType.BILLING_CANCEL_IMMEDIATE,
    payload: {
      subscriptionId,
      endedAt: endedIso,
      manageUrl: billingDashboardUrl,
    },
    dedupeKey: `${NotificationType.BILLING_CANCEL_IMMEDIATE}:${subscriptionId}:${endedIso}`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  });
}

export async function emitBillingCancelScheduled({
  userId,
  subscriptionId,
  endsAt,
}: {
  userId: string;
  subscriptionId: string;
  endsAt: Date;
}) {
  const endsIso = endsAt.toISOString();
  await dispatchNotification({
    userId,
    type: NotificationType.BILLING_CANCEL_SCHEDULED,
    payload: {
      subscriptionId,
      endsAt: endsIso,
      manageUrl: billingDashboardUrl,
    },
    dedupeKey: `${NotificationType.BILLING_CANCEL_SCHEDULED}:${subscriptionId}:${endsIso}`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  });
}

export async function emitBillingInvoiceReady({
  userId,
  invoiceId,
  invoiceNumber,
  amount,
  issuedAt,
}: {
  userId: string;
  invoiceId: string;
  invoiceNumber: string | null;
  amount: number;
  issuedAt: Date;
}) {
  const invoiceUrl = buildAbsoluteUrl(`/api/invoices/${invoiceId}/pdf`);

  await dispatchNotification({
    userId,
    type: NotificationType.BILLING_INVOICE_READY,
    payload: {
      invoiceId,
      invoiceNumber,
      amount,
      issuedAt: issuedAt.toISOString(),
      invoiceUrl,
      manageUrl: billingDashboardUrl,
    },
    dedupeKey: `${NotificationType.BILLING_INVOICE_READY}:${invoiceId}`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  });
}

export async function emitBillingInvoiceRefundReady({
  userId,
  invoiceId,
  invoiceNumber,
  amount,
  issuedAt,
}: {
  userId: string;
  invoiceId: string;
  invoiceNumber: string | null;
  amount: number;
  issuedAt: Date;
}) {
  const invoiceUrl = buildAbsoluteUrl(`/api/invoices/${invoiceId}/pdf`);

  await dispatchNotification({
    userId,
    type: NotificationType.BILLING_INVOICE_REFUND_READY,
    payload: {
      invoiceId,
      invoiceNumber,
      amount,
      issuedAt: issuedAt.toISOString(),
      invoiceUrl,
    },
    dedupeKey: `${NotificationType.BILLING_INVOICE_REFUND_READY}:${invoiceId}`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  });
}

export async function emitBillingWebhookAlert({
  provider,
  idempotencyKey,
  error,
  logUrl,
  email,
}: {
  provider: string;
  idempotencyKey: string;
  error: string;
  logUrl?: string;
  email?: string;
}) {
  await dispatchNotification({
    userId: "ops", // placeholder id for logging; should be replaced with real ops user if available
    type: NotificationType.BILLING_WEBHOOK_ALERT,
    payload: {
      provider,
      idempotencyKey,
      error,
      logUrl: logUrl ?? billingHistoryUrl,
    },
    dedupeKey: `${NotificationType.BILLING_WEBHOOK_ALERT}:${provider}:${idempotencyKey}`,
    channels: [NotificationChannel.EMAIL],
    emailRecipient: email ?? process.env.NOTIFICATIONS_INTERNAL_EMAIL ?? undefined,
  });
}

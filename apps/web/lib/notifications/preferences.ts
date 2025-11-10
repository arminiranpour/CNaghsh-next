import {
  NotificationCategory,
  NotificationChannel,
  NotificationType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { buildAbsoluteUrl } from "@/lib/url";

import { generateManageToken } from "./signing";

export const CATEGORY_CONFIG: Record<NotificationCategory, {
  title: string;
  description: string;
  locked: boolean;
}> = {
  [NotificationCategory.BILLING_TRANSACTIONAL]: {
    title: "اعلان‌های حیاتی صورتحساب",
    description: "تمدیدها، رسیدها و رویدادهای حیاتی که برای حفظ دسترسی شما لازم است.",
    locked: true,
  },
  [NotificationCategory.BILLING_REMINDERS]: {
    title: "یادآوری‌ها و نکات",
    description: "هشدارهای پیش از انقضا و توصیه‌های مدیریت اشتراک.",
    locked: false,
  },
};

const TYPE_CATEGORY_MAP: Partial<Record<NotificationType, NotificationCategory>> = {
  [NotificationType.BILLING_SUBSCRIPTION_RENEWED]: NotificationCategory.BILLING_TRANSACTIONAL,
  [NotificationType.BILLING_SUBSCRIPTION_EXPIRY_REMINDER]: NotificationCategory.BILLING_REMINDERS,
  [NotificationType.BILLING_SUBSCRIPTION_EXPIRED]: NotificationCategory.BILLING_TRANSACTIONAL,
  [NotificationType.BILLING_PAYMENT_FAILED]: NotificationCategory.BILLING_TRANSACTIONAL,
  [NotificationType.BILLING_REFUND_ISSUED]: NotificationCategory.BILLING_TRANSACTIONAL,
  [NotificationType.BILLING_CANCEL_IMMEDIATE]: NotificationCategory.BILLING_TRANSACTIONAL,
  [NotificationType.BILLING_CANCEL_SCHEDULED]: NotificationCategory.BILLING_TRANSACTIONAL,
  [NotificationType.BILLING_INVOICE_READY]: NotificationCategory.BILLING_TRANSACTIONAL,
  [NotificationType.BILLING_INVOICE_REFUND_READY]: NotificationCategory.BILLING_TRANSACTIONAL,
};

export function resolveCategoryForType(type: NotificationType): NotificationCategory {
  return TYPE_CATEGORY_MAP[type] ?? NotificationCategory.BILLING_TRANSACTIONAL;
}

export type NotificationPreferenceRecord = {
  category: NotificationCategory;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  locked: boolean;
};

export async function getUserPreferences(userId: string): Promise<NotificationPreferenceRecord[]> {
  const stored = await prisma.notificationPreference.findMany({
    where: { userId },
  });

  return (Object.values(NotificationCategory) as NotificationCategory[]).map((category) => {
    const config = CATEGORY_CONFIG[category];
    const record = stored.find((item) => item.category === category);
    return {
      category,
      emailEnabled: record ? record.emailEnabled : true,
      inAppEnabled: record ? record.inAppEnabled : true,
      locked: config.locked,
    } satisfies NotificationPreferenceRecord;
  });
}

export async function isChannelEnabled({
  userId,
  category,
  channel,
}: {
  userId: string;
  category: NotificationCategory;
  channel: NotificationChannel;
}): Promise<boolean> {
  const config = CATEGORY_CONFIG[category];
  if (config.locked) {
    return true;
  }

  const preference = await prisma.notificationPreference.findUnique({
    where: {
      userId_category: { userId, category },
    },
  });

  if (!preference) {
    return true;
  }

  return channel === NotificationChannel.EMAIL ? preference.emailEnabled : preference.inAppEnabled;
}

export async function setUserPreference({
  userId,
  category,
  emailEnabled,
  inAppEnabled,
}: {
  userId: string;
  category: NotificationCategory;
  emailEnabled: boolean;
  inAppEnabled: boolean;
}): Promise<void> {
  const config = CATEGORY_CONFIG[category];
  if (config.locked) {
    return;
  }

  await prisma.notificationPreference.upsert({
    where: {
      userId_category: { userId, category },
    },
    create: {
      userId,
      category,
      emailEnabled,
      inAppEnabled,
    },
    update: {
      emailEnabled,
      inAppEnabled,
    },
  });
}

export function buildManagePreferencesLink(userId: string): string {
  const token = generateManageToken(userId);
  return buildAbsoluteUrl(`/notifications/manage/${token}`);
}

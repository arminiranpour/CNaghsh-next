import type { ChallengeParticipationStatus, ChallengeStatus } from "@prisma/client";

import { formatRials } from "@/lib/money";

export const challengeStatusLabels: Record<ChallengeStatus, string> = {
  draft: "پیش‌نویس",
  published: "منتشرشده",
  archived: "آرشیوشده",
};

export const challengeParticipationStatusLabels: Record<ChallengeParticipationStatus, string> = {
  registered: "ثبت‌نام شده",
  payment_pending: "در انتظار پرداخت",
  submitted: "ارسال شده",
  reviewed: "در حال بررسی",
  accepted: "پذیرفته شده",
  rejected: "رد شده",
};

export const challengeUploadEligibleStatuses = new Set<ChallengeParticipationStatus>([
  "registered",
  "submitted",
  "reviewed",
  "accepted",
  "rejected",
]);

export const formatChallengePrice = (amountIrr: number) => {
  if (!Number.isFinite(amountIrr) || amountIrr <= 0) {
    return "رایگان";
  }
  return formatRials(amountIrr);
};

export const formatChallengeMediaLimit = (seconds?: number | null) => {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) {
    return "بدون محدودیت مشخص";
  }

  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `${new Intl.NumberFormat("fa-IR").format(minutes)} دقیقه`;
  }

  return `${new Intl.NumberFormat("fa-IR").format(seconds)} ثانیه`;
};

export const isChallengePaid = (amountIrr: number) => Number.isFinite(amountIrr) && amountIrr > 0;

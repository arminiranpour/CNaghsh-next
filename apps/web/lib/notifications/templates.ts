import { NotificationType } from "@prisma/client";

type TemplatePayload = Record<string, unknown> | undefined;

type TemplateResult = {
  title: string;
  body: string;
};

const systemAutoUnpublishReasons: Record<string, string> = {
  USER_INTENT_PRIVATE: "نمایش پروفایل توسط تنظیمات کاربر غیرفعال شد.",
  ENTITLEMENT_EXPIRED: "اشتراک شما منقضی شده است.",
  NOT_APPROVED: "پروفایل شما هنوز تایید نشده است.",
  NO_ENTITLEMENT: "شما اشتراک فعال برای انتشار ندارید.",
  PUBLISHABILITY_REVOKED: "شرایط نمایش پروفایل در حال حاضر مهیا نیست.",
};

function getReasonText(reasonKey?: unknown): string {
  if (typeof reasonKey !== "string" || reasonKey.length === 0) {
    return "دلیل مشخصی ثبت نشده است.";
  }

  return systemAutoUnpublishReasons[reasonKey] ?? `دلیل: ${reasonKey}`;
}

const templates: Record<NotificationType, (payload: TemplatePayload) => TemplateResult> = {
  [NotificationType.MODERATION_APPROVED]: () => ({
    title: "پروفایل شما تایید شد و منتشر شد.",
    body: "پروفایل شما تایید شد و اکنون برای عموم نمایش داده می‌شود. در صورت نیاز می‌توانید از طریق داشبورد آن را به‌روز کنید.",
  }),
  [NotificationType.MODERATION_REJECTED]: (payload) => {
    const reason =
      (payload && typeof payload === "object" && "reason" in payload
        ? payload.reason
        : undefined) ?? "";

    const reasonText = typeof reason === "string" && reason.trim().length > 0
      ? reason.trim()
      : "دلیل مشخص نشده است.";

    return {
      title: "پروفایل شما رد شد.",
      body: `پروفایل شما رد شد: ${reasonText}`,
    };
  },
  [NotificationType.MODERATION_PENDING]: () => ({
    title: "پروفایل شما برای بازبینی قرار گرفت.",
    body: "پروفایل شما برای بازبینی قرار گرفت و پس از بررسی نتیجه اطلاع‌رسانی می‌شود.",
  }),
  [NotificationType.MODERATION_HIDDEN]: () => ({
    title: "نمایش پروفایل شما توسط مدیر مخفی شد.",
    body: "نمایش پروفایل شما توسط مدیر مخفی شد. برای جزئیات بیشتر می‌توانید با پشتیبانی تماس بگیرید.",
  }),
  [NotificationType.MODERATION_UNHIDDEN]: () => ({
    title: "نمایش پروفایل شما توسط مدیر نمایش داده شد.",
    body: "نمایش پروفایل شما توسط مدیر فعال شد و پروفایل دوباره قابل مشاهده است.",
  }),
  [NotificationType.SYSTEM_AUTO_UNPUBLISH]: (payload) => {
    const reasonKey =
      payload && typeof payload === "object" && "reasonKey" in payload
        ? payload.reasonKey
        : undefined;

    const reasonText = getReasonText(reasonKey);

    return {
      title: "پروفایل شما به‌صورت سیستمی از نمایش خارج شد.",
      body: `پروفایل شما به‌صورت خودکار از نمایش خارج شد. ${reasonText}`,
    };
  },
  [NotificationType.USER_PUBLISH_SUBMITTED]: () => ({
    title: "پروفایل شما برای بررسی ارسال شد.",
    body: "پروفایل شما برای بررسی ارسال شد. نتیجه بررسی به‌زودی اعلام می‌شود.",
  }),
  [NotificationType.USER_UNPUBLISHED]: () => ({
    title: "پروفایل شما از نمایش عمومی خارج شد.",
    body: "پروفایل شما از نمایش عمومی خارج شد. هر زمان خواستید می‌توانید آن را دوباره منتشر کنید.",
  }),
  [NotificationType.ENTITLEMENT_EXPIRED]: () => ({
    title: "اشتراک شما منقضی شده و پروفایل از نمایش خارج شد.",
    body: "اشتراک شما منقضی شده و پروفایل از نمایش خارج شد. برای ادامه نمایش، لطفاً اشتراک خود را تمدید کنید.",
  }),
  [NotificationType.ENTITLEMENT_RESTORED]: () => ({
    title: "اشتراک فعال شد؛ پروفایل شما مجدداً نمایش داده می‌شود.",
    body: "اشتراک شما فعال شد و پروفایل دوباره برای عموم نمایش داده می‌شود. سپاس از همراهی شما.",
  }),
};

export function getNotificationTemplate(
  type: NotificationType,
  payload?: TemplatePayload,
): TemplateResult {
  return templates[type](payload);
}

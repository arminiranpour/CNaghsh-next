import { NotificationType } from "@prisma/client";

import type { EmailContent } from "./email";

const jalaliDateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium" });
const jalaliDateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "medium",
  timeStyle: "short",
});
const rialFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

type TemplatePayload = Record<string, unknown> | undefined;

type TemplateResult = {
  title: string;
  body: string;
  email?: EmailContent | null;
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

function isJobPayload(payload: TemplatePayload): payload is {
  context: "job";
  jobId: string;
  jobTitle?: string;
  jobStatus?: string;
  action?: string;
  note?: string;
  featuredUntil?: string | null;
} {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      "context" in payload &&
      (payload as Record<string, unknown>).context === "job" &&
      typeof (payload as Record<string, unknown>).jobId === "string",
  );
}

function getJobTitle(payload: { jobTitle?: string }): string {
  if (payload.jobTitle && typeof payload.jobTitle === "string") {
    return payload.jobTitle.trim() || "آگهی بدون عنوان";
  }
  return "آگهی بدون عنوان";
}

function getJobStatus(payload: { jobStatus?: string }): string {
  if (payload.jobStatus && typeof payload.jobStatus === "string") {
    return payload.jobStatus;
  }
  return "DRAFT";
}

function getJobLink(jobId: string, jobStatus: string): string {
  if (jobStatus === "PUBLISHED") {
    return `/jobs/${jobId}`;
  }
  return `/dashboard/jobs/${jobId}/edit`;
}

function formatPersianDate(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(date);
}

function formatJalaliDate(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return jalaliDateFormatter.format(date);
}

function formatJalaliDateTime(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return jalaliDateTimeFormatter.format(date);
}

function formatRialAmount(value?: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0 ریال";
  }
  return `${rialFormatter.format(Math.abs(Math.trunc(value)))} ریال`;
}

function getPayloadString(payload: TemplatePayload, key: string): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const value = (payload as Record<string, unknown>)[key];
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

function getPayloadNumber(payload: TemplatePayload, key: string): number | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const value = (payload as Record<string, unknown>)[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function formatIsoDate(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "Z");
}

function getPayloadUrl(payload: TemplatePayload, key: string, fallback: string): string {
  const value = getPayloadString(payload, key);
  if (value && /^https?:\/\//i.test(value)) {
    return value;
  }
  if (value && value.startsWith("/")) {
    return value;
  }
  return fallback;
}

const DEFAULT_BILLING_URL = "/dashboard/billing";

const templates: Record<NotificationType, (payload: TemplatePayload) => TemplateResult> = {
  [NotificationType.MODERATION_APPROVED]: (payload) => {
    if (isJobPayload(payload)) {
      const jobTitle = getJobTitle(payload);
      const jobStatus = getJobStatus(payload);
      const link = getJobLink(payload.jobId, jobStatus);

      return {
        title: "آگهی شما تایید شد",
        body: `آگهی «${jobTitle}» تایید شد. برای مدیریت آگهی به این لینک مراجعه کنید: ${link}`,
      };
    }

    return {
      title: "پروفایل شما تایید شد و منتشر شد.",
      body: "پروفایل شما تایید شد و اکنون برای عموم نمایش داده می‌شود. در صورت نیاز می‌توانید از طریق داشبورد آن را به‌روز کنید.",
    };
  },
  [NotificationType.MODERATION_REJECTED]: (payload) => {
    if (isJobPayload(payload)) {
      const jobTitle = getJobTitle(payload);
      const link = getJobLink(payload.jobId, getJobStatus(payload));
      const note =
        payload.note && typeof payload.note === "string" && payload.note.trim().length > 0
          ? payload.note.trim()
          : "دلیل مشخص نشده است.";

      return {
        title: "آگهی شما رد شد",
        body: `آگهی «${jobTitle}» رد شد. دلیل: ${note} — ویرایش آگهی: ${link}`,
      };
    }

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
  [NotificationType.MODERATION_PENDING]: (payload) => {
    if (isJobPayload(payload)) {
      const jobTitle = getJobTitle(payload);
      const jobStatus = getJobStatus(payload);
      const link = getJobLink(payload.jobId, jobStatus);
      const action = typeof payload.action === "string" ? payload.action : "PENDING";
      const note =
        payload.note && typeof payload.note === "string" && payload.note.trim().length > 0
          ? ` دلیل: ${payload.note.trim()}`
          : "";

      if (action === "SUSPENDED") {
        return {
          title: "آگهی شما معلق شد",
          body: `آگهی «${jobTitle}» به دلیل نقض قوانین معلق شد.${note} برای بررسی بیشتر به داشبورد مراجعه کنید: ${link}`,
        };
      }

      if (action === "FEATURED") {
        const formattedDate = formatPersianDate(payload.featuredUntil ?? null);
        const untilPart = formattedDate
          ? ` تا تاریخ ${formattedDate}`
          : "";
        return {
          title: "آگهی شما ویژه شد",
          body: `آگهی «${jobTitle}»${untilPart} در بخش ویژه نمایش داده می‌شود. مدیریت آگهی: ${link}`,
        };
      }

      if (action === "UNFEATURED") {
        return {
          title: "آگهی شما از ویژه خارج شد",
          body: `آگهی «${jobTitle}» دیگر به‌صورت ویژه نمایش داده نمی‌شود. برای مدیریت آگهی به این لینک بروید: ${link}`,
        };
      }

      if (action === "CLOSED") {
        return {
          title: "آگهی شما بسته شد",
          body: `آگهی «${jobTitle}» توسط تیم پشتیبانی بسته شد. برای مشاهده جزئیات به داشبورد مراجعه کنید: ${link}`,
        };
      }

      return {
        title: "آگهی شما در صف بررسی است",
        body: `آگهی «${jobTitle}» برای بررسی دوباره ثبت شد.${note} برای پیگیری به داشبورد بروید: ${link}`,
      };
    }

    return {
      title: "پروفایل شما برای بازبینی قرار گرفت.",
      body: "پروفایل شما برای بازبینی قرار گرفت و پس از بررسی نتیجه اطلاع‌رسانی می‌شود.",
    };
  },
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
  [NotificationType.BILLING_SUBSCRIPTION_RENEWED]: (payload) => {
    const planName = getPayloadString(payload, "planName") ?? "پلن اشتراک";
    const endsAt = getPayloadString(payload, "endsAt");
    const invoiceNumber = getPayloadString(payload, "invoiceNumber");
    const invoiceUrl = getPayloadUrl(payload, "invoiceUrl", `${DEFAULT_BILLING_URL}/history`);
    const manageUrl = getPayloadUrl(payload, "manageUrl", DEFAULT_BILLING_URL);
    const note = getPayloadString(payload, "changeNote");
    const endsJalali = formatJalaliDate(endsAt) ?? "نامشخص";
    const endsIso = formatIsoDate(endsAt) ?? "—";

    const parts = [
      `اشتراک شما برای پلن ${planName} تا ${endsJalali} تمدید شد.`,
      `برای مشاهده وضعیت به ${manageUrl} مراجعه کنید.`,
    ];

    if (note) {
      parts.push(note);
    }

    const email: EmailContent = {
      subject: "تمدید اشتراک شما با موفقیت انجام شد",
      preheader: `اشتراک شما تا ${endsJalali} (${endsIso}) تمدید شد.`,
      headline: "تمدید اشتراک با موفقیت انجام شد",
      tone: "success",
      paragraphs: [
        `اشتراک شما برای پلن ${planName} بدون وقفه تمدید شد و دسترسی‌ها فعال باقی ماند.`,
        `اعتبار جدید تا ${endsJalali} (${endsIso}) معتبر است.`,
      ],
      keyValues: [
        { label: "پلن", value: planName },
        { label: "پایان دوره", value: `${endsJalali} – ${endsIso}` },
        ...(invoiceNumber ? [{ label: "شماره فاکتور", value: invoiceNumber }] : []),
      ],
      primaryAction: { label: "مدیریت اشتراک", href: manageUrl },
      secondaryActions: [{ label: "دانلود رسید", href: invoiceUrl }],
      footerNote: note ?? "در صورت نیاز می‌توانید از بخش صورتحساب، پلن خود را تغییر دهید.",
    };

    return {
      title: "اشتراک شما تمدید شد",
      body: parts.join(" "),
      email,
    };
  },
  [NotificationType.BILLING_SUBSCRIPTION_EXPIRY_REMINDER]: (payload) => {
    const endsAt = getPayloadString(payload, "endsAt");
    const endsJalali = formatJalaliDate(endsAt) ?? "نامشخص";
    const endsIso = formatIsoDate(endsAt) ?? "—";
    const renewUrl = getPayloadUrl(payload, "renewUrl", `${DEFAULT_BILLING_URL}/renew`);
    const impactNote =
      getPayloadString(payload, "impactNote") ?? "با انقضای اشتراک، امکان نمایش عمومی پروفایل غیرفعال می‌شود.";

    const email: EmailContent = {
      subject: `یادآوری: اشتراک شما تا ${endsJalali} معتبر است`,
      preheader: `برای جلوگیری از توقف دسترسی، پیش از ${endsJalali} (${endsIso}) تمدید کنید.`,
      headline: "اشتراک شما به‌زودی منقضی می‌شود",
      tone: "warning",
      paragraphs: [
        `اشتراک شما تا تاریخ ${endsJalali} (${endsIso}) معتبر است.`,
        impactNote,
      ],
      keyValues: [{ label: "تاریخ انقضا", value: `${endsJalali} – ${endsIso}` }],
      primaryAction: { label: "تمدید اکنون", href: renewUrl },
      footerNote: "تمدید به‌موقع باعث می‌شود دسترسی به انتشار و دیده شدن پروفایل شما بدون وقفه ادامه یابد.",
    };

    return {
      title: "یادآوری انقضا",
      body: `اشتراک شما تا ${endsJalali} معتبر است. برای جلوگیری از توقف دسترسی، اکنون تمدید کنید: ${renewUrl}`,
      email,
    };
  },
  [NotificationType.BILLING_SUBSCRIPTION_EXPIRED]: (payload) => {
    const expiredAt = getPayloadString(payload, "expiredAt");
    const expiredLabel = formatJalaliDateTime(expiredAt) ?? "اکنون";
    const expiredIso = formatIsoDate(expiredAt) ?? "—";
    const renewUrl = getPayloadUrl(payload, "renewUrl", `${DEFAULT_BILLING_URL}/renew`);

    const email: EmailContent = {
      subject: "اشتراک شما منقضی شد",
      preheader: "برای بازیابی دسترسی‌ها می‌توانید دوباره تمدید کنید.",
      headline: "اشتراک منقضی شد",
      tone: "error",
      paragraphs: [
        `اشتراک شما در ${expiredLabel} (${expiredIso}) منقضی شد و دسترسی انتشار پروفایل متوقف شده است.`,
        "با تمدید مجدد می‌توانید بلافاصله دسترسی‌ها را فعال کنید.",
      ],
      primaryAction: { label: "تمدید اشتراک", href: renewUrl },
      footerNote: "پس از تمدید، انتشار پروفایل و سایر مزایا به صورت خودکار بازگردانده می‌شود.",
    };

    return {
      title: "اشتراک شما منقضی شد",
      body: `اشتراک شما در ${expiredLabel} منقضی شد و دسترسی‌ها متوقف شدند. برای فعال‌سازی دوباره، تمدید را از ${renewUrl} انجام دهید.`,
      email,
    };
  },
  [NotificationType.BILLING_PAYMENT_FAILED]: (payload) => {
    const amount = getPayloadNumber(payload, "amount");
    const provider = getPayloadString(payload, "providerLabel") ?? "درگاه پرداخت";
    const reference = getPayloadString(payload, "referenceMasked") ?? "—";
    const retryUrl = getPayloadUrl(payload, "retryUrl", DEFAULT_BILLING_URL);
    const supportUrl = getPayloadUrl(payload, "supportUrl", "mailto:support@cnaghsh.com");

    const formattedAmount = amount !== null ? formatRialAmount(amount) : "—";

    const email: EmailContent = {
      subject: "پرداخت ناموفق بود",
      preheader: "پرداخت شما انجام نشد؛ لطفاً دوباره تلاش کنید یا با پشتیبانی در تماس باشید.",
      headline: "پرداخت اشتراک ناموفق بود",
      tone: "error",
      paragraphs: [
        "پرداخت اخیر شما توسط درگاه تأیید نشد و اشتراک هنوز تمدید نشده است.",
        "می‌توانید دوباره تلاش کنید یا در صورت تکرار مشکل با پشتیبانی تماس بگیرید.",
      ],
      keyValues: [
        { label: "مبلغ", value: formattedAmount },
        { label: "درگاه", value: provider },
        { label: "شناسه تراکنش", value: reference },
      ],
      primaryAction: { label: "تلاش دوباره پرداخت", href: retryUrl },
      secondaryActions: [{ label: "تماس با پشتیبانی", href: supportUrl }],
      footerNote: "در صورت انجام پرداخت جدید، رسید آن برای شما ارسال خواهد شد.",
    };

    return {
      title: "پرداخت ناموفق بود",
      body: `پرداخت به مبلغ ${formattedAmount} در درگاه ${provider} ناموفق بود. برای تلاش دوباره به ${retryUrl} مراجعه کنید یا با پشتیبانی تماس بگیرید: ${supportUrl}. شناسه: ${reference}.`,
      email,
    };
  },
  [NotificationType.BILLING_REFUND_ISSUED]: (payload) => {
    const amount = getPayloadNumber(payload, "amount") ?? 0;
    const formattedAmount = formatRialAmount(amount);
    const invoiceNumber = getPayloadString(payload, "invoiceNumber");
    const pdfUrl = getPayloadUrl(payload, "pdfUrl", `${DEFAULT_BILLING_URL}/history`);
    const policyNote = getPayloadString(payload, "policyNote") ?? "دسترسی‌های فعال شما حفظ شده‌اند.";
    const original = getPayloadString(payload, "originalInvoiceNumber");

    const amountLabel = amount > 0 ? `-${formattedAmount}` : formattedAmount;

    const email: EmailContent = {
      subject: "استرداد پرداخت شما ثبت شد",
      preheader: `مبلغ ${amountLabel} به شما برگشت داده شد.`,
      headline: "استرداد شما انجام شد",
      tone: "neutral",
      paragraphs: [
        `استرداد به مبلغ ${amountLabel} ثبت شد و در صورت نیاز می‌توانید رسید آن را مشاهده کنید.`,
        policyNote,
      ],
      keyValues: [
        ...(invoiceNumber ? [{ label: "شماره استرداد", value: invoiceNumber }] : []),
        ...(original ? [{ label: "فاکتور اصلی", value: original }] : []),
      ],
      primaryAction: { label: "مشاهده رسید استرداد", href: pdfUrl },
    };

    return {
      title: "استرداد شما ثبت شد",
      body: `استرداد به مبلغ ${amountLabel} برای شما ثبت شد. رسید مربوطه از ${pdfUrl} قابل دانلود است. ${policyNote}`,
      email,
    };
  },
  [NotificationType.BILLING_CANCEL_IMMEDIATE]: (payload) => {
    const endedAt = getPayloadString(payload, "endedAt");
    const endedLabel = formatJalaliDateTime(endedAt) ?? "اکنون";
    const endedIso = formatIsoDate(endedAt) ?? "—";
    const manageUrl = getPayloadUrl(payload, "manageUrl", DEFAULT_BILLING_URL);

    const email: EmailContent = {
      subject: "لغو فوری اشتراک شما انجام شد",
      preheader: "دسترسی شما همین حالا متوقف شد.",
      headline: "اشتراک فوراً لغو شد",
      tone: "warning",
      paragraphs: [
        `لغو فوری اشتراک انجام شد و دسترسی‌ها از ${endedLabel} (${endedIso}) متوقف گردید.`,
        "در صورت تمایل می‌توانید هر زمان مجدداً اشتراک را فعال کنید.",
      ],
      primaryAction: { label: "مدیریت اشتراک", href: manageUrl },
    };

    return {
      title: "اشتراک شما لغو شد",
      body: `لغو فوری اشتراک ثبت شد و دسترسی شما از ${endedLabel} متوقف می‌شود. برای مدیریت مجدد به ${manageUrl} مراجعه کنید.`,
      email,
    };
  },
  [NotificationType.BILLING_CANCEL_SCHEDULED]: (payload) => {
    const endsAt = getPayloadString(payload, "endsAt");
    const endsLabel = formatJalaliDate(endsAt) ?? "زمان مشخص";
    const endsIso = formatIsoDate(endsAt) ?? "—";
    const manageUrl = getPayloadUrl(payload, "manageUrl", DEFAULT_BILLING_URL);

    const email: EmailContent = {
      subject: "لغو در پایان دوره ثبت شد",
      preheader: `اشتراک شما تا ${endsLabel} (${endsIso}) فعال می‌ماند.`,
      headline: "لغو در پایان دوره",
      tone: "neutral",
      paragraphs: [
        `درخواست لغو شما ثبت شد و اشتراک در ${endsLabel} (${endsIso}) به پایان می‌رسد.`,
        "تا آن تاریخ همچنان به مزایا دسترسی دارید و می‌توانید لغو را بازگردانید.",
      ],
      primaryAction: { label: "لغو درخواست لغو", href: manageUrl },
    };

    return {
      title: "لغو در پایان دوره ثبت شد",
      body: `اشتراک شما در تاریخ ${endsLabel} پایان می‌یابد. تا آن زمان دسترسی برقرار است. برای لغو درخواست یا تمدید به ${manageUrl} مراجعه کنید.`,
      email,
    };
  },
  [NotificationType.BILLING_INVOICE_READY]: (payload) => {
    const invoiceNumber = getPayloadString(payload, "invoiceNumber") ?? "—";
    const amount = getPayloadNumber(payload, "amount");
    const formattedAmount = amount !== null ? formatRialAmount(amount) : "—";
    const issuedAt = getPayloadString(payload, "issuedAt");
    const issuedJalali = formatJalaliDateTime(issuedAt) ?? "اکنون";
    const issuedIso = formatIsoDate(issuedAt) ?? "—";
    const invoiceUrl = getPayloadUrl(payload, "invoiceUrl", `${DEFAULT_BILLING_URL}/history`);
    const manageUrl = getPayloadUrl(payload, "manageUrl", DEFAULT_BILLING_URL);

    const email: EmailContent = {
      subject: "رسید پرداخت شما آماده است",
      preheader: `رسید شماره ${invoiceNumber} به مبلغ ${formattedAmount} صادر شد.`,
      headline: "رسید پرداخت آماده است",
      tone: "success",
      paragraphs: [
        `رسید پرداخت شماره ${invoiceNumber} صادر شد. مبلغ کل ${formattedAmount} است.`,
      ],
      keyValues: [
        { label: "شماره رسید", value: invoiceNumber },
        { label: "تاریخ صدور", value: `${issuedJalali} – ${issuedIso}` },
        { label: "مبلغ", value: formattedAmount },
      ],
      primaryAction: { label: "دانلود رسید", href: invoiceUrl },
      secondaryActions: [{ label: "مدیریت صورتحساب", href: manageUrl }],
    };

    return {
      title: "رسید پرداخت صادر شد",
      body: `رسید شماره ${invoiceNumber} با مبلغ ${formattedAmount} صادر شد. برای دانلود، به ${invoiceUrl} مراجعه کنید.`,
      email,
    };
  },
  [NotificationType.BILLING_INVOICE_REFUND_READY]: (payload) => {
    const invoiceNumber = getPayloadString(payload, "invoiceNumber") ?? "—";
    const amount = getPayloadNumber(payload, "amount");
    const formattedAmount = amount !== null ? formatRialAmount(amount) : "—";
    const issuedAt = getPayloadString(payload, "issuedAt");
    const issuedJalali = formatJalaliDateTime(issuedAt) ?? "اکنون";
    const issuedIso = formatIsoDate(issuedAt) ?? "—";
    const invoiceUrl = getPayloadUrl(payload, "invoiceUrl", `${DEFAULT_BILLING_URL}/history`);

    const email: EmailContent = {
      subject: "رسید استرداد شما آماده است",
      preheader: `رسید استرداد شماره ${invoiceNumber} آماده دانلود است.`,
      headline: "رسید استرداد صادر شد",
      tone: "neutral",
      paragraphs: [
        `رسید استرداد شماره ${invoiceNumber} با مبلغ ${formattedAmount} صادر شد.`,
      ],
      keyValues: [
        { label: "شماره رسید", value: invoiceNumber },
        { label: "تاریخ", value: `${issuedJalali} – ${issuedIso}` },
        { label: "مبلغ استرداد", value: formattedAmount },
      ],
      primaryAction: { label: "دانلود رسید استرداد", href: invoiceUrl },
    };

    return {
      title: "رسید استرداد صادر شد",
      body: `رسید استرداد شماره ${invoiceNumber} با مبلغ ${formattedAmount} آماده است. برای مشاهده، به ${invoiceUrl} مراجعه کنید.`,
      email,
    };
  },
  [NotificationType.BILLING_WEBHOOK_ALERT]: (payload) => {
    const provider = getPayloadString(payload, "provider") ?? "نامشخص";
    const idempotencyKey = getPayloadString(payload, "idempotencyKey") ?? "—";
    const errorSummary = getPayloadString(payload, "error") ?? "جزئیات خطا ثبت نشده است.";
    const contextUrl = getPayloadUrl(payload, "logUrl", `${DEFAULT_BILLING_URL}/webhooks`);

    const email: EmailContent = {
      subject: "هشدار وبهوک پرداخت",
      preheader: `پیام دریافتی از ${provider} نیازمند بررسی است.`,
      headline: "وبهوک پرداخت با خطا مواجه شد",
      tone: "error",
      paragraphs: [
        `وبهوک پرداخت از ارائه‌دهنده ${provider} با خطا مواجه شد.`,
        `کلید idempotency: ${idempotencyKey}.`,
        errorSummary,
      ],
      primaryAction: { label: "بررسی گزارش", href: contextUrl },
    };

    return {
      title: "هشدار وبهوک پرداخت",
      body: `وبهوک پرداخت از ${provider} با خطا روبه‌رو شد. کلید: ${idempotencyKey}. جزئیات: ${errorSummary}.`,
      email,
    };
  },
};

export function getNotificationTemplate(
  type: NotificationType,
  payload?: TemplatePayload,
): TemplateResult {
  return templates[type](payload);
}

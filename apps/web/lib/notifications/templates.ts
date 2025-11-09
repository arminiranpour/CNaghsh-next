import { NotificationType } from "@prisma/client";

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
  [NotificationType.BILLING_REFUND_ISSUED]: (payload) => {
    const amount = typeof payload === "object" && payload && "amount" in payload ? payload.amount : undefined;
    const remaining =
      typeof payload === "object" && payload && "remainingAmount" in payload
        ? payload.remainingAmount
        : undefined;
    const invoiceNumber =
      payload && typeof payload === "object" && "invoiceNumber" in payload && payload.invoiceNumber
        ? String(payload.invoiceNumber)
        : null;
    const pdfUrl =
      payload && typeof payload === "object" && "pdfUrl" in payload && typeof payload.pdfUrl === "string"
        ? payload.pdfUrl
        : "/dashboard/billing";

    const title = invoiceNumber ? `استرداد شماره ${invoiceNumber}` : "استرداد شما ثبت شد";
    const parts = [
      `مبلغ ${formatRialAmount(typeof amount === "number" ? amount : 0)} به حساب شما بازگردانده شد.`,
    ];

    if (typeof remaining === "number" && remaining > 0) {
      parts.push(`مبلغ باقیمانده قابل بازپرداخت: ${formatRialAmount(remaining)}.`);
    }

    parts.push(`مشاهده سند بازپرداخت: ${pdfUrl}`);

    return { title, body: parts.join(" ") };
  },
  [NotificationType.BILLING_CANCEL_IMMEDIATE]: (payload) => {
    const endedAt =
      payload && typeof payload === "object" && "endedAt" in payload && typeof payload.endedAt === "string"
        ? payload.endedAt
        : null;
    const endedLabel = formatJalaliDateTime(endedAt) ?? "اکنون";

    return {
      title: "اشتراک شما لغو شد",
      body: `لغو فوری اشتراک ثبت شد و دسترسی شما از ${endedLabel} متوقف می‌شود. برای مدیریت مجدد اشتراک می‌توانید به /dashboard/billing مراجعه کنید.`,
    };
  },
  [NotificationType.BILLING_CANCEL_SCHEDULED]: (payload) => {
    const endsAt =
      payload && typeof payload === "object" && "endsAt" in payload && typeof payload.endsAt === "string"
        ? payload.endsAt
        : null;
    const endsLabel = formatJalaliDate(endsAt) ?? "زمان مشخص";

    return {
      title: "لغو در پایان دوره ثبت شد",
      body: `اشتراک شما در تاریخ ${endsLabel} لغو می‌شود و تا آن زمان دسترسی فعال خواهد بود. برای تغییر تصمیم خود به /dashboard/billing سر بزنید.`,
    };
  },
};

export function getNotificationTemplate(
  type: NotificationType,
  payload?: TemplatePayload,
): TemplateResult {
  return templates[type](payload);
}

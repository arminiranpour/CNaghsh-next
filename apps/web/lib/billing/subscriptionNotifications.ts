import { formatJalaliDate, formatJalaliDateTime } from "@/lib/datetime/jalali";
import { sendEmail } from "@/lib/notifications/email";
import { buildAbsoluteUrl } from "@/lib/url";

type BaseContext = {
  userId: string;
  planName?: string | null;
};

type ImmediateCancelContext = BaseContext & {
  endedAt: Date;
};

type ScheduledCancelContext = BaseContext & {
  endsAt: Date;
};

const billingDashboardUrl = buildAbsoluteUrl("/dashboard/billing");

export async function sendImmediateCancellationEmail({
  userId,
  planName,
  endedAt,
}: ImmediateCancelContext) {
  try {
    const endedLabel = formatJalaliDateTime(endedAt) ?? "اکنون";
    const planLabel = planName ? `برای پلن ${planName} ` : "";
    const body = [
      `لغو فوری ${planLabel}ثبت شد و دسترسی شما تا ${endedLabel} خاتمه می‌یابد.`,
      `برای بررسی یا فعال‌سازی مجدد به داشبورد صورتحساب مراجعه کنید: ${billingDashboardUrl}`,
    ].join("<br />");

    await sendEmail(userId, "لغو فوری اشتراک ثبت شد", body);
  } catch (error) {
    console.error("subscription_cancel_immediate_email_failed", { userId, error });
  }
}

export async function sendScheduledCancellationEmail({
  userId,
  planName,
  endsAt,
}: ScheduledCancelContext) {
  try {
    const endsLabel = formatJalaliDate(endsAt) ?? "تاریخ مشخص";
    const planLabel = planName ? `برای پلن ${planName} ` : "";
    const body = [
      `درخواست لغو ${planLabel}ثبت شد و اشتراک در تاریخ ${endsLabel} پایان می‌یابد.`,
      `تا آن زمان دسترسی شما برقرار است. برای مدیریت اشتراک به ${billingDashboardUrl} مراجعه کنید.`,
    ].join("<br />");

    await sendEmail(userId, "لغو در پایان دوره ثبت شد", body);
  } catch (error) {
    console.error("subscription_cancel_scheduled_email_failed", { userId, error });
  }
}

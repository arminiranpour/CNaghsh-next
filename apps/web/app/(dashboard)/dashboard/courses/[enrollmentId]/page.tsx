import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerAuthSession } from "@/lib/auth/session";
import { startEnrollmentCheckoutAction } from "@/lib/courses/enrollments/actions";
import { getUserEnrollmentDetail } from "@/lib/courses/enrollments/queries";
import { formatDayOfWeek, formatIrr, formatMinutesToTime } from "@/lib/courses/format";
import { getLumpSumPayableAmount } from "@/lib/courses/pricing";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/datetime/jalali";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const dayOrder = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"] as const;

const statusLabels = {
  pending_payment: "در انتظار پرداخت",
  active: "فعال",
  canceled: "لغو شده",
  refunded: "بازپرداخت شده",
} as const;

const statusVariants = {
  pending_payment: "warning",
  active: "success",
  canceled: "secondary",
  refunded: "secondary",
} as const;

const paymentModeLabels = {
  lumpsum: "پرداخت یکجا",
  installments: "پرداخت اقساطی",
} as const;

const installmentStatusLabels = {
  due: "سررسید",
  paid: "پرداخت شده",
  failed: "ناموفق",
} as const;

const paymentErrorMessages: Record<string, string> = {
  ENROLLMENT_NOT_FOUND: "ثبت‌نام پیدا نشد.",
  FORBIDDEN: "اجازه دسترسی ندارید.",
  INVALID_ENROLLMENT_STATUS: "وضعیت ثبت‌نام معتبر نیست.",
  PAYMENT_MODE_MISMATCH: "روش پرداخت با ثبت‌نام همخوانی ندارد.",
  ALREADY_PAID: "پرداخت قبلاً ثبت شده است.",
  COURSE_NOT_PUBLISHED: "دوره منتشر نشده است.",
  SEMESTER_NOT_OPEN: "ترم برای پرداخت باز نیست.",
  UNSUPPORTED_CURRENCY: "ارز پشتیبانی نمی‌شود.",
  INSTALLMENTS_DISABLED: "پرداخت اقساطی فعال نیست.",
  INVALID_INSTALLMENT: "قسط انتخابی معتبر نیست.",
  INVALID_AMOUNT: "مبلغ معتبر نیست.",
  UNKNOWN_PROVIDER: "درگاه پرداخت معتبر نیست.",
  INVALID_PAYMENT_MODE: "روش پرداخت معتبر نیست.",
  UNKNOWN_ERROR: "عملیات ناموفق بود.",
};

type SearchParams = Record<string, string | string[] | undefined>;

const getSearchParam = (searchParams: SearchParams | undefined, key: string) => {
  const value = searchParams?.[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === "string" ? value : undefined;
};

export default async function DashboardEnrollmentDetailPage({
  params,
  searchParams,
}: {
  params: { enrollmentId: string };
  searchParams?: SearchParams;
}) {
  noStore();
  const session = await getServerAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>ورود موردنیاز است</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            برای مشاهده جزئیات ثبت‌نام وارد شوید.
          </CardContent>
        </Card>
      </div>
    );
  }

  const detail = await getUserEnrollmentDetail({
    enrollmentId: params.enrollmentId,
    userId,
  });

  if (!detail) {
    notFound();
  }

  const { enrollment, pricing, installments, installmentProgress, nextInstallment, lumpSumPayment } = detail;
  const lumpSumPayable = getLumpSumPayableAmount(pricing);
  const lumpSumDiscount = Math.max(0, pricing.lumpSum.base - lumpSumPayable);

  const scheduleDays = [...enrollment.semester.scheduleDays]
    .map((day) => ({
      ...day,
      classSlots: [...day.classSlots].sort((a, b) => a.startMinute - b.startMinute),
    }))
    .sort(
      (a, b) =>
        dayOrder.indexOf(a.dayOfWeek as (typeof dayOrder)[number]) -
        dayOrder.indexOf(b.dayOfWeek as (typeof dayOrder)[number])
    );

  const paymentError = getSearchParam(searchParams, "payment") === "error"
    ? getSearchParam(searchParams, "reason")
    : null;
  const paymentMessage = paymentError
    ? paymentErrorMessages[paymentError] ?? paymentErrorMessages.UNKNOWN_ERROR
    : null;

  const checkoutAction = startEnrollmentCheckoutAction.bind(
    null,
    enrollment.id,
    `/dashboard/courses/${enrollment.id}`
  );

  return (
    <div className="space-y-6" dir="rtl">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold">جزئیات ثبت‌نام</h2>
        <p className="text-sm text-muted-foreground">
          وضعیت پرداخت و اطلاعات ترم انتخابی شما در این بخش نمایش داده می‌شود.
        </p>
      </header>

      {paymentMessage ? (
        <Card>
          <CardContent className="py-4 text-sm text-destructive">
            {paymentMessage}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>دوره</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{enrollment.semester.course.title}</p>
            <p className="text-muted-foreground">{enrollment.semester.title}</p>
            <p className="text-muted-foreground">
              {formatJalaliDate(enrollment.semester.startsAt)} تا {formatJalaliDate(enrollment.semester.endsAt)}
            </p>
            <Link
              href={`/courses/${enrollment.semester.course.id}/semesters/${enrollment.semester.id}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              مشاهده صفحه ترم
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>وضعیت ثبت‌نام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Badge variant={statusVariants[enrollment.status] ?? "secondary"}>
              {statusLabels[enrollment.status] ?? enrollment.status}
            </Badge>
            <p>
              روش پرداخت:{" "}
              {paymentModeLabels[enrollment.chosenPaymentMode] ?? enrollment.chosenPaymentMode}
            </p>
            <p>
              شناسه ثبت‌نام: <span className="font-mono">{enrollment.id}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>خلاصه پرداخت</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>شهریه پایه: {formatIrr(pricing.lumpSum.base)}</p>
            <p>تخفیف پرداخت یکجا: {formatIrr(lumpSumDiscount)}</p>
            <p>مبلغ نهایی: {formatIrr(lumpSumPayable)}</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">برنامه هفتگی</h3>
        {scheduleDays.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              برنامه هفتگی ثبت نشده است.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {scheduleDays.map((day) => (
              <Card key={day.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{formatDayOfWeek(day.dayOfWeek)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {day.classSlots.length === 0 ? (
                    <p className="text-muted-foreground">ساعتی ثبت نشده است.</p>
                  ) : (
                    day.classSlots.map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between">
                        <span>
                          {formatMinutesToTime(slot.startMinute)} تا{" "}
                          {formatMinutesToTime(slot.endMinute)}
                        </span>
                        <span className="text-muted-foreground">{slot.title || "کلاس"}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">جزئیات پرداخت</h3>

        {enrollment.chosenPaymentMode === "lumpsum" ? (
          <Card>
            <CardHeader>
              <CardTitle>پرداخت یکجا</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>مبلغ کل: {formatIrr(lumpSumPayable)}</p>
              <p>
                وضعیت پرداخت:{" "}
                {enrollment.status === "active" || enrollment.status === "refunded"
                  ? "پرداخت شده"
                  : "پرداخت نشده"}
              </p>
              <p>
                شناسه پرداخت:{" "}
                {lumpSumPayment ? (
                  <span className="font-mono">{lumpSumPayment.id}</span>
                ) : (
                  "ثبت نشده"
                )}
              </p>
              <p>
                شناسه فاکتور:{" "}
                {lumpSumPayment?.invoice ? (
                  <span className="font-mono">
                    {lumpSumPayment.invoice.number ?? lumpSumPayment.invoice.id}
                  </span>
                ) : (
                  "ثبت نشده"
                )}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>اقساط</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-4">
                <span>
                  پرداخت شده: {installmentProgress.paidCount}/{installmentProgress.totalCount}
                </span>
                {nextInstallment ? (
                  <span className="text-muted-foreground">
                    قسط بعدی: {formatIrr(nextInstallment.amountIrr)}
                  </span>
                ) : null}
              </div>
              {installments.length === 0 ? (
                <p className="text-muted-foreground">هنوز اقساطی ثبت نشده است.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-muted/40 text-left">
                      <tr>
                        <th className="px-4 py-2 font-medium">قسط</th>
                        <th className="px-4 py-2 font-medium">مبلغ</th>
                        <th className="px-4 py-2 font-medium">وضعیت</th>
                        <th className="px-4 py-2 font-medium">تاریخ پرداخت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {installments.map((installment) => (
                        <tr key={installment.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2">{installment.index}</td>
                          <td className="px-4 py-2">{formatIrr(installment.amountIrr)}</td>
                          <td className="px-4 py-2">
                            {installmentStatusLabels[installment.status] ?? installment.status}
                          </td>
                          <td className="px-4 py-2">
                            {installment.paidAt ? formatJalaliDateTime(installment.paidAt) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>اقدامات پرداخت</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {enrollment.status === "pending_payment" ? (
              enrollment.chosenPaymentMode === "lumpsum" ? (
                <form action={checkoutAction} className="space-y-2">
                  <p>مبلغ: {formatIrr(lumpSumPayable)}</p>
                  <input type="hidden" name="paymentMode" value="lumpsum" />
                  <Button type="submit">پرداخت</Button>
                </form>
              ) : nextInstallment ? (
                <form action={checkoutAction} className="space-y-2">
                  <p>مبلغ قسط: {formatIrr(nextInstallment.amountIrr)}</p>
                  <input type="hidden" name="paymentMode" value="installments" />
                  <input type="hidden" name="installmentIndex" value={nextInstallment.index} />
                  <Button type="submit">
                    {nextInstallment.index === 1 ? "پرداخت قسط اول" : "پرداخت قسط بعدی"}
                  </Button>
                </form>
              ) : (
                <p className="text-muted-foreground">قسطی برای پرداخت یافت نشد.</p>
              )
            ) : enrollment.status === "active" ? (
              <p className="text-muted-foreground">پرداخت تکمیل شد.</p>
            ) : enrollment.status === "canceled" ? (
              <p className="text-muted-foreground">این ثبت‌نام لغو شده است.</p>
            ) : (
              <p className="text-muted-foreground">این ثبت‌نام بازپرداخت شده است.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

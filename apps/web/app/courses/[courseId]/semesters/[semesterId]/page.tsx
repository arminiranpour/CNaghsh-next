import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerAuthSession } from "@/lib/auth/session";
import { startEnrollmentAction } from "@/lib/courses/enrollment/actions";
import { formatDayOfWeek, formatIrr, formatMinutesToTime } from "@/lib/courses/format";
import { computeSemesterPricing } from "@/lib/courses/pricing";
import { fetchPublicSemesterById } from "@/lib/courses/public/queries";
import { formatJalaliDate } from "@/lib/datetime/jalali";
import { prisma } from "@/lib/db";

const dayOrder = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"] as const;
const enrollmentStatusLabels = {
  pending_payment: "در انتظار پرداخت",
  active: "فعال",
  canceled: "لغو شده",
  refunded: "بازپرداخت شده",
} as const;
const paymentModeLabels = {
  lumpsum: "پرداخت یکجا",
  installments: "پرداخت اقساطی",
} as const;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SemesterDetailPage({
  params,
  searchParams,
}: {
  params: { courseId: string; semesterId: string };
  searchParams?: SearchParams;
}) {
  const semester = await fetchPublicSemesterById(params.courseId, params.semesterId);

  if (!semester) {
    notFound();
  }

  const session = await getServerAuthSession();
  const userId = session?.user?.id ?? null;
  const enrollmentParam = Array.isArray(searchParams?.enrollment)
    ? searchParams?.enrollment[0]
    : searchParams?.enrollment;

  const showSuccess = enrollmentParam === "success";
  const showError = enrollmentParam === "error";
  const showClosed = enrollmentParam === "closed";
  const pricing = computeSemesterPricing(semester);

  const scheduleDays = [...semester.scheduleDays]
    .map((day) => ({
      ...day,
      classSlots: [...day.classSlots].sort((a, b) => a.startMinute - b.startMinute),
    }))
    .sort(
      (a, b) =>
        dayOrder.indexOf(a.dayOfWeek as (typeof dayOrder)[number]) -
        dayOrder.indexOf(b.dayOfWeek as (typeof dayOrder)[number])
    );

  const existingEnrollment = userId
    ? await prisma.enrollment.findUnique({
        where: { semesterId_userId: { semesterId: semester.id, userId } },
        select: {
          id: true,
          status: true,
          chosenPaymentMode: true,
        },
      })
    : null;

  const installmentRecords =
    existingEnrollment?.chosenPaymentMode === "installments"
      ? await prisma.coursePaymentInstallment.findMany({
          where: { enrollmentId: existingEnrollment.id },
          orderBy: { index: "asc" },
          select: { index: true, status: true, amountIrr: true },
        })
      : [];

  const nextInstallment =
    existingEnrollment?.chosenPaymentMode === "installments"
      ? installmentRecords.find((item) => item.status !== "paid") ??
        (pricing.installments
          ? {
              index: 1,
              amountIrr: pricing.installments.amountPerInstallment,
              status: "due",
            }
          : null)
      : null;

  const allInstallmentsPaid =
    existingEnrollment?.chosenPaymentMode === "installments" &&
    installmentRecords.length > 0 &&
    installmentRecords.every((item) => item.status === "paid");

  const loginUrl = `/auth/signin?callbackUrl=${encodeURIComponent(
    `/courses/${params.courseId}/semesters/${params.semesterId}`
  )}`;
  const enrollmentAction = startEnrollmentAction.bind(
    null,
    params.courseId,
    params.semesterId
  );
  const checkoutPath = existingEnrollment
    ? `/api/courses/enrollments/${existingEnrollment.id}/checkout`
    : null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{semester.title}</h1>
        <p className="text-sm text-muted-foreground">
          {formatJalaliDate(semester.startsAt)} تا {formatJalaliDate(semester.endsAt)}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>شهریه</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>مبلغ پایه: {formatIrr(pricing.lumpSum.base)}</p>
            <p>پرداخت یکجا: {formatIrr(pricing.lumpSum.total)}</p>
            {pricing.lumpSum.discount > 0 ? (
              <p>تخفیف پرداخت یکجا: {formatIrr(pricing.lumpSum.discount)}</p>
            ) : (
              <p className="text-muted-foreground">تخفیف پرداخت یکجا ندارد</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>پرداخت اقساطی</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {pricing.installments ? (
              <>
                <p>تعداد اقساط: {pricing.installments.count}</p>
                <p>مبلغ هر قسط: {formatIrr(pricing.installments.amountPerInstallment)}</p>
                {pricing.installments.lastInstallmentAmount !==
                pricing.installments.amountPerInstallment ? (
                  <p>قسط آخر: {formatIrr(pricing.installments.lastInstallmentAmount)}</p>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">امکان پرداخت اقساطی ندارد</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>مدرس</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{semester.course.instructorName}</p>
            <Link
              href={`/courses/${semester.course.id}`}
              className="mt-2 inline-flex text-primary underline-offset-4 hover:underline"
            >
              مشاهده دوره
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">برنامه هفتگی</h2>
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
                        <span className="text-muted-foreground">
                          {slot.title || "کلاس"}
                        </span>
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
        <h2 className="text-xl font-semibold">ثبت‌نام</h2>

        {showSuccess ? (
          <Card>
            <CardHeader>
              <CardTitle>ثبت‌نام آغاز شد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>درخواست ثبت‌نام شما با موفقیت ثبت شد.</p>
              {existingEnrollment ? (
                <>
                  <p>وضعیت: {existingEnrollment.status}</p>
                  <p>
                    روش پرداخت:{" "}
                    {existingEnrollment.chosenPaymentMode === "lumpsum"
                      ? "پرداخت یکجا"
                      : "پرداخت اقساطی"}
                  </p>
                </>
              ) : null}
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p>پرداخت یکجا: {formatIrr(pricing.lumpSum.total)}</p>
                {pricing.installments ? (
                  <p>
                    پرداخت اقساطی: {pricing.installments.count} قسط، هر قسط{" "}
                    {formatIrr(pricing.installments.amountPerInstallment)}
                  </p>
                ) : (
                  <p className="text-muted-foreground">پرداخت اقساطی ندارد</p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {showError ? (
          <Card>
            <CardHeader>
              <CardTitle>امکان ثبت‌نام وجود ندارد</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              اطلاعات وارد شده یا وضعیت ترم معتبر نیست. لطفاً دوباره تلاش کنید.
            </CardContent>
          </Card>
        ) : null}
        {showClosed ? (
          <Card>
            <CardHeader>
              <CardTitle>ترم بسته شده است</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              این ترم بسته شده است و امکان ثبت‌نام جدید ندارد.
            </CardContent>
          </Card>
        ) : null}

        {!userId ? (
          <Button asChild>
            <Link href={loginUrl}>برای ثبت‌نام وارد شوید</Link>
          </Button>
        ) : existingEnrollment ? (
          <Card>
            <CardHeader>
              <CardTitle>پرداخت</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                وضعیت: {enrollmentStatusLabels[existingEnrollment.status] ?? existingEnrollment.status}
              </p>
              <p>
                روش پرداخت:{" "}
                {paymentModeLabels[existingEnrollment.chosenPaymentMode] ??
                  existingEnrollment.chosenPaymentMode}
              </p>
              <Link
                href={`/dashboard/courses/${existingEnrollment.id}`}
                className="inline-flex text-primary underline-offset-4 hover:underline"
              >
                مشاهده وضعیت ثبت‌نام
              </Link>
              {existingEnrollment.status === "pending_payment" ? (
                existingEnrollment.chosenPaymentMode === "lumpsum" ? (
                  <form action={checkoutPath ?? undefined} method="post" className="space-y-2">
                    <p>مبلغ: {formatIrr(pricing.lumpSum.total)}</p>
                    <input type="hidden" name="paymentMode" value="lumpsum" />
                    <Button type="submit">پرداخت</Button>
                  </form>
                ) : nextInstallment ? (
                  <form action={checkoutPath ?? undefined} method="post" className="space-y-2">
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
              ) : existingEnrollment.status === "active" ? (
                existingEnrollment.chosenPaymentMode === "installments" &&
                !allInstallmentsPaid &&
                nextInstallment ? (
                  <form action={checkoutPath ?? undefined} method="post" className="space-y-2">
                    <p>مبلغ قسط: {formatIrr(nextInstallment.amountIrr)}</p>
                    <input type="hidden" name="paymentMode" value="installments" />
                    <input type="hidden" name="installmentIndex" value={nextInstallment.index} />
                    <Button type="submit">پرداخت قسط بعدی</Button>
                  </form>
                ) : (
                  <p className="text-muted-foreground">پرداخت تکمیل شد.</p>
                )
              ) : (
                <p className="text-muted-foreground">این ثبت‌نام فعال نیست.</p>
              )}
            </CardContent>
          </Card>
        ) : semester.status !== "open" ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              این ترم بسته شده است و امکان ثبت‌نام ندارد.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>انتخاب روش پرداخت</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={enrollmentAction} className="space-y-4 text-sm">
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymentMode"
                      value="lumpsum"
                      defaultChecked
                      className="h-4 w-4"
                    />
                    <span>پرداخت یکجا</span>
                  </label>
                  {pricing.installments ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="paymentMode"
                        value="installments"
                        className="h-4 w-4"
                      />
                      <span>پرداخت اقساطی</span>
                    </label>
                  ) : null}
                </div>
                <Button type="submit">ثبت‌نام</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

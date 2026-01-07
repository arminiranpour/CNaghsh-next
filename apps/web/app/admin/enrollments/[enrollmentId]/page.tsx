import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { requireAdmin } from "@/lib/admin/auth";
import {
  cancelEnrollmentAction,
  refundEnrollmentAction,
  overrideEnrollmentStatusAction,
} from "@/lib/courses/admin/enrollments/actions";
import { getAdminEnrollmentDetail } from "@/lib/courses/admin/enrollments/queries";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/datetime/jalali";
import { formatRials } from "@/lib/money";

const statusLabels = {
  pending_payment: "در انتظار پرداخت",
  active: "فعال",
  canceled: "لغو شده",
  refunded: "بازپرداخت شده",
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

const noticeMessages: Record<string, string> = {
  canceled: "ثبت‌نام لغو شد.",
  already_canceled: "این ثبت‌نام قبلاً لغو شده است.",
  refunded: "بازپرداخت ثبت شد.",
  already_refunded: "این ثبت‌نام قبلاً بازپرداخت شده است.",
  status_updated: "وضعیت ثبت‌نام به‌روزرسانی شد.",
  no_change: "وضعیت بدون تغییر باقی ماند.",
};

const errorMessages: Record<string, string> = {
  not_found: "ثبت‌نام پیدا نشد.",
  invalid_status: "وضعیت انتخابی معتبر نیست.",
};

type SearchParams = Record<string, string | string[] | undefined>;

const getSearchParam = (searchParams: SearchParams | undefined, key: string) => {
  const value = searchParams?.[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === "string" ? value : undefined;
};

export default async function AdminEnrollmentDetailPage({
  params,
  searchParams,
}: {
  params: { enrollmentId: string };
  searchParams?: SearchParams;
}) {
  try {
    await requireAdmin();
  } catch (error) {
    return (
      <div dir="rtl" className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-lg border border-border bg-background p-6 text-center text-sm text-muted-foreground">
          دسترسی شما به این بخش مجاز نیست.
        </div>
      </div>
    );
  }

  const enrollment = await getAdminEnrollmentDetail(params.enrollmentId);

  if (!enrollment) {
    notFound();
  }

  const noticeKey = getSearchParam(searchParams, "notice");
  const errorKey = getSearchParam(searchParams, "error");
  const noticeMessage = noticeKey ? noticeMessages[noticeKey] : null;
  const errorMessage = errorKey ? errorMessages[errorKey] : null;

  const checkoutSessions = enrollment.checkoutSessions;
  const payments = checkoutSessions.flatMap((session) =>
    session.payments.map((payment) => ({
      ...payment,
      sessionId: session.id,
      paymentMode: session.paymentMode,
      installmentIndex: session.installmentIndex,
      sessionStatus: session.status,
    }))
  );

  return (
    <div className="space-y-6" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">جزئیات ثبت‌نام</h1>
        <p className="text-sm text-muted-foreground">
          اطلاعات کاربر، پرداخت‌ها و اقدامات پشتیبانی برای این ثبت‌نام.
        </p>
      </header>

      {noticeMessage ? (
        <Card>
          <CardContent className="py-4 text-sm text-emerald-600">{noticeMessage}</CardContent>
        </Card>
      ) : null}
      {errorMessage ? (
        <Card>
          <CardContent className="py-4 text-sm text-destructive">{errorMessage}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>کاربر</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{enrollment.user.email}</p>
            <p className="text-muted-foreground">{enrollment.user.name ?? "—"}</p>
            <p className="text-muted-foreground">{enrollment.user.id}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>دوره و ترم</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{enrollment.semester.course.title}</p>
            <p className="text-muted-foreground">{enrollment.semester.title}</p>
            <p className="text-muted-foreground">
              {formatJalaliDate(enrollment.semester.startsAt)} تا {formatJalaliDate(enrollment.semester.endsAt)}
            </p>
            <Link
              href={`/admin/courses/${enrollment.semester.course.id}/semesters/${enrollment.semester.id}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              مدیریت ترم
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>وضعیت ثبت‌نام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{statusLabels[enrollment.status] ?? enrollment.status}</p>
            <p>{paymentModeLabels[enrollment.chosenPaymentMode] ?? enrollment.chosenPaymentMode}</p>
            <p className="text-muted-foreground">{formatJalaliDateTime(enrollment.createdAt)}</p>
            <p className="text-muted-foreground">شناسه: {enrollment.id}</p>
          </CardContent>
        </Card>
      </section>

      {enrollment.chosenPaymentMode === "installments" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">اقساط</h2>
          {enrollment.paymentInstallments.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                هنوز اقساطی ثبت نشده است.
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-background">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">قسط</th>
                    <th className="px-4 py-3 font-medium">مبلغ</th>
                    <th className="px-4 py-3 font-medium">وضعیت</th>
                    <th className="px-4 py-3 font-medium">سررسید</th>
                    <th className="px-4 py-3 font-medium">پرداخت</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollment.paymentInstallments.map((installment) => (
                    <tr key={installment.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">{installment.index}</td>
                      <td className="px-4 py-3">{formatRials(installment.amountIrr)}</td>
                      <td className="px-4 py-3">
                        {installmentStatusLabels[installment.status] ?? installment.status}
                      </td>
                      <td className="px-4 py-3">
                        {installment.dueAt ? formatJalaliDateTime(installment.dueAt) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {installment.paidAt ? formatJalaliDateTime(installment.paidAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">جلسات پرداخت</h2>
        {checkoutSessions.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              جلسه پرداختی ثبت نشده است.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-background">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">شناسه</th>
                  <th className="px-4 py-3 font-medium">درگاه</th>
                  <th className="px-4 py-3 font-medium">وضعیت</th>
                  <th className="px-4 py-3 font-medium">روش</th>
                  <th className="px-4 py-3 font-medium">قسط</th>
                  <th className="px-4 py-3 font-medium">زمان</th>
                </tr>
              </thead>
              <tbody>
                {checkoutSessions.map((session) => (
                  <tr key={session.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{session.id}</td>
                    <td className="px-4 py-3">{session.provider}</td>
                    <td className="px-4 py-3">{session.status}</td>
                    <td className="px-4 py-3">
                      {session.paymentMode
                        ? paymentModeLabels[session.paymentMode] ?? session.paymentMode
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {session.installmentIndex ?? "—"}
                    </td>
                    <td className="px-4 py-3">{formatJalaliDateTime(session.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">پرداخت‌ها و فاکتورها</h2>
        {payments.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              پرداختی ثبت نشده است.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-background">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">شناسه پرداخت</th>
                  <th className="px-4 py-3 font-medium">وضعیت</th>
                  <th className="px-4 py-3 font-medium">مبلغ</th>
                  <th className="px-4 py-3 font-medium">درگاه</th>
                  <th className="px-4 py-3 font-medium">فاکتور</th>
                  <th className="px-4 py-3 font-medium">زمان</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{payment.id}</td>
                    <td className="px-4 py-3">{payment.status}</td>
                    <td className="px-4 py-3">{formatRials(payment.amount)}</td>
                    <td className="px-4 py-3">{payment.provider}</td>
                    <td className="px-4 py-3">
                      {payment.invoice ? (
                        payment.invoice.number ?? payment.invoice.id
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">{formatJalaliDateTime(payment.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">اقدامات پشتیبانی</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>لغو ثبت‌نام</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={cancelEnrollmentAction.bind(null, enrollment.id)} className="space-y-2">
                <Button type="submit" variant="destructive">
                  لغو ثبت‌نام
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>بازپرداخت</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={refundEnrollmentAction.bind(null, enrollment.id)} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="reason">دلیل (اختیاری)</Label>
                  <Input id="reason" name="reason" placeholder="مثلاً بازپرداخت دستی" />
                </div>
                <Button type="submit" variant="destructive">
                  ثبت بازپرداخت
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>تغییر وضعیت</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={overrideEnrollmentStatusAction.bind(null, enrollment.id)} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="status">وضعیت جدید</Label>
                  <Select name="status" defaultValue="pending_payment">
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending_payment">در انتظار پرداخت</SelectItem>
                      <SelectItem value="active">فعال</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit">ثبت وضعیت</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

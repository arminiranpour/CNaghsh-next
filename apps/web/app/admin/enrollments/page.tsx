import Link from "next/link";
import type { EnrollmentStatus, PaymentMode } from "@prisma/client";

import { Button } from "@/components/ui/button";
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
import { listAdminEnrollments, getEnrollmentAdminSummary } from "@/lib/courses/admin/enrollments/queries";
import { formatJalaliDateTime } from "@/lib/datetime/jalali";
import { formatRials } from "@/lib/money";

type StatusFilterValue = EnrollmentStatus | "all";
type PaymentModeFilterValue = PaymentMode | "all";

const statusOptions: Array<{ value: StatusFilterValue; label: string }> = [
  { value: "all", label: "همه وضعیت‌ها" },
  { value: "pending_payment", label: "در انتظار پرداخت" },
  { value: "active", label: "فعال" },
  { value: "canceled", label: "لغو شده" },
  { value: "refunded", label: "بازپرداخت شده" },
];

const paymentModeOptions: Array<{ value: PaymentModeFilterValue; label: string }> = [
  { value: "all", label: "همه روش‌ها" },
  { value: "lumpsum", label: "پرداخت یکجا" },
  { value: "installments", label: "پرداخت اقساطی" },
];

const statusLabels: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  active: "فعال",
  canceled: "لغو شده",
  refunded: "بازپرداخت شده",
};

const paymentModeLabels: Record<string, string> = {
  lumpsum: "پرداخت یکجا",
  installments: "پرداخت اقساطی",
};

const parseDate = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
};

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
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

  const statusRaw = typeof searchParams.status === "string" ? searchParams.status : "all";
  const paymentModeRaw =
    typeof searchParams.paymentMode === "string" ? searchParams.paymentMode : "all";
  const courseIdParam = typeof searchParams.courseId === "string" ? searchParams.courseId.trim() : "";
  const semesterIdParam =
    typeof searchParams.semesterId === "string" ? searchParams.semesterId.trim() : "";
  const fromParam = typeof searchParams.from === "string" ? searchParams.from : undefined;
  const toParam = typeof searchParams.to === "string" ? searchParams.to : undefined;

  const statusParam: StatusFilterValue =
    statusOptions.find((option) => option.value === statusRaw)?.value ?? "all";
  const paymentModeParam: PaymentModeFilterValue =
    paymentModeOptions.find((option) => option.value === paymentModeRaw)?.value ?? "all";

  const filters = {
    status: statusParam !== "all" ? statusParam : undefined,
    paymentMode: paymentModeParam !== "all" ? paymentModeParam : undefined,
    courseId: courseIdParam || undefined,
    semesterId: semesterIdParam || undefined,
    from: parseDate(fromParam),
    to: parseDate(toParam),
  };

  const [summary, enrollments] = await Promise.all([
    getEnrollmentAdminSummary(),
    listAdminEnrollments(filters),
  ]);

  return (
    <div className="space-y-6" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">مدیریت ثبت‌نام‌ها</h1>
        <p className="text-sm text-muted-foreground">
          ثبت‌نام‌ها و پرداخت‌ها را بررسی و در صورت نیاز اقدامات پشتیبانی انجام دهید.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-5">
        <div className="rounded-lg border border-border bg-background p-4 text-sm">
          <p className="text-muted-foreground">ثبت‌نام ۳۰ روز اخیر</p>
          <p className="mt-2 text-lg font-semibold">{summary.totalRecent}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4 text-sm">
          <p className="text-muted-foreground">فعال</p>
          <p className="mt-2 text-lg font-semibold">{summary.activeCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4 text-sm">
          <p className="text-muted-foreground">در انتظار پرداخت</p>
          <p className="mt-2 text-lg font-semibold">{summary.pendingCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4 text-sm">
          <p className="text-muted-foreground">اقساط سررسید گذشته</p>
          <p className="mt-2 text-lg font-semibold">{summary.delinquentCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4 text-sm">
          <p className="text-muted-foreground">درآمد ۳۰ روز اخیر</p>
          <p className="mt-2 text-lg font-semibold">{formatRials(summary.revenueIrr)}</p>
        </div>
      </section>

      <form method="get" className="rounded-lg border border-border bg-background p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="courseId">شناسه دوره</Label>
            <Input id="courseId" name="courseId" defaultValue={courseIdParam} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="semesterId">شناسه ترم</Label>
            <Input id="semesterId" name="semesterId" defaultValue={semesterIdParam} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">وضعیت ثبت‌نام</Label>
            <Select name="status" defaultValue={statusParam}>
              <SelectTrigger id="status">
                <SelectValue placeholder="همه وضعیت‌ها" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentMode">روش پرداخت</Label>
            <Select name="paymentMode" defaultValue={paymentModeParam}>
              <SelectTrigger id="paymentMode">
                <SelectValue placeholder="همه روش‌ها" />
              </SelectTrigger>
              <SelectContent>
                {paymentModeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="from">از تاریخ</Label>
            <Input id="from" name="from" type="date" defaultValue={fromParam ?? ""} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">تا تاریخ</Label>
            <Input id="to" name="to" type="date" defaultValue={toParam ?? ""} dir="ltr" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit">اعمال فیلتر</Button>
          <Button asChild variant="secondary">
            <Link href="/admin/enrollments">حذف فیلترها</Link>
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">کاربر</th>
              <th className="px-4 py-3 font-medium">دوره / ترم</th>
              <th className="px-4 py-3 font-medium">وضعیت</th>
              <th className="px-4 py-3 font-medium">روش پرداخت</th>
              <th className="px-4 py-3 font-medium">پیشرفت پرداخت</th>
              <th className="px-4 py-3 font-medium">تاریخ ثبت</th>
              <th className="px-4 py-3 font-medium">جزئیات</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={7}>
                  ثبت‌نامی مطابق فیلترها پیدا نشد.
                </td>
              </tr>
            ) : (
              enrollments.map((enrollment) => (
                <tr key={enrollment.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <p>{enrollment.user.email}</p>
                      <p className="text-xs text-muted-foreground">{enrollment.user.id}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <p>{enrollment.semester.course.title}</p>
                      <p className="text-xs text-muted-foreground">{enrollment.semester.title}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {statusLabels[enrollment.status] ?? enrollment.status}
                  </td>
                  <td className="px-4 py-3">
                    {paymentModeLabels[enrollment.chosenPaymentMode] ?? enrollment.chosenPaymentMode}
                  </td>
                  <td className="px-4 py-3">
                    {enrollment.paymentProgress.paid}/{enrollment.paymentProgress.total}
                  </td>
                  <td className="px-4 py-3">{formatJalaliDateTime(enrollment.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/enrollments/${enrollment.id}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      مشاهده
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

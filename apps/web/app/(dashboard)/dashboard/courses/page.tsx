import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerAuthSession } from "@/lib/auth/session";
import { formatIrr } from "@/lib/courses/format";
import { listUserEnrollments } from "@/lib/courses/enrollments/queries";
import { formatJalaliDate } from "@/lib/datetime/jalali";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export default async function DashboardCoursesPage() {
  noStore();
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>ورود موردنیاز است</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            برای مشاهده دوره‌های ثبت‌نامی، ابتدا وارد حساب کاربری خود شوید.
          </CardContent>
        </Card>
      </div>
    );
  }

  const enrollments = await listUserEnrollments(session.user.id);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold">دوره‌های من</h2>
        <p className="text-sm text-muted-foreground">
          وضعیت ثبت‌نام‌ها و اطلاعات ترم‌های انتخابی شما در این بخش نمایش داده می‌شود.
        </p>
      </header>

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            هنوز در هیچ ترمی ثبت‌نام نکرده‌اید.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">دوره</th>
                <th className="px-4 py-3 font-medium">ترم</th>
                <th className="px-4 py-3 font-medium">تاریخ</th>
                <th className="px-4 py-3 font-medium">روش پرداخت</th>
                <th className="px-4 py-3 font-medium">پیشرفت پرداخت</th>
                <th className="px-4 py-3 font-medium">وضعیت</th>
                <th className="px-4 py-3 font-medium">جزئیات</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enrollment) => (
                <tr key={enrollment.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{enrollment.semester.course.title}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/courses/${enrollment.id}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {enrollment.semester.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {formatJalaliDate(enrollment.semester.startsAt)} تا{" "}
                    {formatJalaliDate(enrollment.semester.endsAt)}
                  </td>
                  <td className="px-4 py-3">
                    {paymentModeLabels[enrollment.chosenPaymentMode] ?? enrollment.chosenPaymentMode}
                  </td>
                  <td className="px-4 py-3">
                    {enrollment.payment.mode === "lumpsum" ? (
                      enrollment.payment.paid ? (
                        "پرداخت شده"
                      ) : (
                        "پرداخت نشده"
                      )
                    ) : (
                      <div className="space-y-1 text-sm">
                        <div>
                          {enrollment.payment.paidCount}/{enrollment.payment.totalCount} قسط
                        </div>
                        {enrollment.payment.nextAmountIrr ? (
                          <div className="text-muted-foreground">
                            قسط بعدی: {formatIrr(enrollment.payment.nextAmountIrr)}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        statusVariants[enrollment.status] ?? "secondary"
                      }
                    >
                      {statusLabels[enrollment.status] ?? enrollment.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/courses/${enrollment.id}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      مشاهده
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

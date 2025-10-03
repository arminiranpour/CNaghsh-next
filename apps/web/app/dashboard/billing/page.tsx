import { EntitlementKey, InvoiceStatus } from "@prisma/client";

import type { Route } from "next";
import Link from "next/link";

import { SandboxUserIdPrompt } from "@/components/sandbox-user-id";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatRials } from "@/lib/money";
import { prisma } from "@/lib/prisma";

const trackedEntitlements: EntitlementKey[] = [
  EntitlementKey.CAN_PUBLISH_PROFILE,
  EntitlementKey.JOB_POST_CREDIT,
];

const formatDate = (value?: Date | string | null): string | null => {
  if (!value) {
    return null;
  }

  try {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
    }).format(date);
  } catch (error) {
    return null;
  }
};

const getUserId = (value: string | string[] | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
};

const invoiceBadgeVariant: Record<InvoiceStatus, "success" | "outline" | "secondary">
  = {
    [InvoiceStatus.OPEN]: "outline",
    [InvoiceStatus.PAID]: "success",
    [InvoiceStatus.VOID]: "secondary",
  };

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const userId = getUserId(searchParams?.userId);

  if (!userId) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>تنظیم شناسه کاربر</CardTitle>
            <CardDescription>
              برای مشاهده اطلاعات صورتحساب ابتدا شناسه کاربر تست را وارد کنید.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SandboxUserIdPrompt redirectPath={"/dashboard/billing" as Route} />
          </CardContent>
        </Card>
      </div>
    );
  }

  try {
    const [entitlements, invoices] = await Promise.all([
      prisma.userEntitlement.findMany({
        where: {
          userId,
          key: {
            in: trackedEntitlements,
          },
        },
      }),
      prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { payment: true },
        take: 10,
      }),
    ]);

    const profileEntitlement = entitlements.find(
      (item) => item.key === EntitlementKey.CAN_PUBLISH_PROFILE,
    );
    const jobCreditEntitlement = entitlements.find(
      (item) => item.key === EntitlementKey.JOB_POST_CREDIT,
    );

    const now = new Date();
    const expiresAt = profileEntitlement?.expiresAt ?? null;
    const isProfileActive = !!(
      expiresAt && new Date(expiresAt).getTime() > now.getTime()
    );
    const expiryLabel = isProfileActive ? formatDate(expiresAt) ?? "—" : "—";
    const remainingCredits = jobCreditEntitlement?.remainingCredits ?? 0;

    return (
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-xl">وضعیت انتشار پروفایل</CardTitle>
                <CardDescription>
                  پیگیری وضعیت فعال‌سازی انتشار پروفایل شما.
                </CardDescription>
              </div>
              <Badge variant={isProfileActive ? "success" : "secondary"}>
                {isProfileActive ? "فعال" : "غیرفعال"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground">تاریخ انقضا</div>
              <div className="text-lg font-semibold">{expiryLabel}</div>
              <div className="pt-4">
                <Button asChild>
                  <Link href={`/pricing?userId=${encodeURIComponent(userId)}`}>
                    خرید اشتراک
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">اعتبار آگهی شغلی</CardTitle>
              <CardDescription>
                تعداد اعتبار باقی‌مانده برای ثبت آگهی‌های جدید.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-3xl font-bold">{remainingCredits}</div>
                <p className="text-sm text-muted-foreground">
                  هر آگهی جدید یک اعتبار مصرف می‌کند.
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href={`/pricing?userId=${encodeURIComponent(userId)}`}>
                    پرداخت برای آگهی
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">فاکتورهای اخیر</CardTitle>
            <CardDescription>
              آخرین تراکنش‌های شما در اینجا نمایش داده می‌شود.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">فاکتوری یافت نشد.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 font-medium">تاریخ</th>
                      <th className="px-3 py-2 font-medium">مبلغ</th>
                      <th className="px-3 py-2 font-medium">وضعیت</th>
                      <th className="px-3 py-2 font-medium">درگاه</th>
                      <th className="px-3 py-2 font-medium">شناسه پرداخت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => {
                      const createdAtLabel = formatDate(invoice.createdAt) ?? "—";
                      const paymentProvider = invoice.payment?.provider ?? "—";
                      const providerRef = invoice.payment?.providerRef || "—";
                      return (
                        <tr key={invoice.id} className="border-b border-border/60">
                          <td className="px-3 py-2 align-top">{createdAtLabel}</td>
                          <td className="px-3 py-2 align-top">
                            {formatRials(invoice.total)}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <Badge variant={invoiceBadgeVariant[invoice.status]}>
                              {invoice.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 align-top">{paymentProvider}</td>
                          <td className="px-3 py-2 align-top" dir="ltr">
                            {providerRef}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>خطا</CardTitle>
            <CardDescription>
              خطا در دریافت اطلاعات صورتحساب. لطفاً دوباره تلاش کنید.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
}

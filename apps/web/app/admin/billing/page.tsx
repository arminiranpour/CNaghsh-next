import Link from "next/link";
import {
  EntitlementKey,
  InvoiceStatus,
  PaymentStatus,
  SubscriptionStatus,
} from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { formatJalaliDateTime } from "@/lib/datetime/jalali";
import { formatRials } from "@/lib/money";

export const dynamic = "force-dynamic";

const OVERVIEW_WINDOW_DAYS = 30;

const PAYMENT_STATUS_VARIANTS: Record<
  PaymentStatus,
  "success" | "secondary" | "outline" | "destructive"
> = {
  [PaymentStatus.PAID]: "success",
  [PaymentStatus.PENDING]: "outline",
  [PaymentStatus.FAILED]: "destructive",
  [PaymentStatus.REFUNDED]: "secondary",
};

const INVOICE_STATUS_VARIANTS: Record<
  InvoiceStatus,
  "success" | "secondary" | "outline"
> = {
  [InvoiceStatus.DRAFT]: "outline",
  [InvoiceStatus.PAID]: "success",
  [InvoiceStatus.VOID]: "secondary",
  [InvoiceStatus.REFUNDED]: "outline",
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("fa-IR").format(value);
};

const formatOverviewWindow = (days: number): string => {
  return `${formatNumber(days)} روز گذشته`;
};

export default async function BillingOverviewPage() {
  const now = new Date();
  const since = new Date(now.getTime() - OVERVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [
    activeSubscriptions,
    renewingSubscriptions,
    paymentsLast30Days,
    pendingPaymentsCount,
    invoicesLast30Days,
    activePublishEntitlements,
    jobCreditAggregate,
    recentPayments,
    recentInvoices,
  ] = await Promise.all([
    prisma.subscription.count({ where: { status: SubscriptionStatus.active } }),
    prisma.subscription.count({ where: { status: SubscriptionStatus.renewing } }),
    prisma.payment.aggregate({
      where: {
        status: PaymentStatus.PAID,
        createdAt: {
          gte: since,
        },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.payment.count({ where: { status: PaymentStatus.PENDING } }),
    prisma.invoice.count({
      where: {
        issuedAt: {
          gte: since,
        },
      },
    }),
    prisma.userEntitlement.count({
      where: {
        key: EntitlementKey.CAN_PUBLISH_PROFILE,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
    prisma.userEntitlement.aggregate({
      where: {
        key: EntitlementKey.JOB_POST_CREDIT,
      },
      _sum: { remainingCredits: true },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: { select: { email: true, name: true } },
        invoice: { select: { id: true, number: true, status: true } },
      },
    }),
    prisma.invoice.findMany({
      orderBy: { issuedAt: "desc" },
      take: 5,
      include: {
        user: { select: { email: true, name: true } },
        payment: { select: { provider: true, providerRef: true } },
      },
    }),
  ]);

  const totalActiveSubscriptions = activeSubscriptions + renewingSubscriptions;
  const revenueLast30Days = paymentsLast30Days._sum.amount ?? 0;
  const paidPaymentsLast30Days = paymentsLast30Days._count._all ?? 0;
  const remainingJobCredits = jobCreditAggregate._sum.remainingCredits ?? 0;

  return (
    <div className="space-y-8" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">نمای کلی مدیریت صورتحساب</h1>
        <p className="text-sm text-muted-foreground">
          وضعیت اشتراک‌ها، پرداخت‌ها و دسترسی‌های کاربران را در یک نگاه بررسی کنید.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">اشتراک‌های فعال</CardTitle>
            <CardDescription>
              تعداد کل اشتراک‌های فعال و در حال تمدید.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-4xl font-bold">{formatNumber(totalActiveSubscriptions)}</div>
              <p className="text-xs text-muted-foreground">
                {formatNumber(renewingSubscriptions)} اشتراک در حال تمدید
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/billing/subscriptions">مدیریت اشتراک‌ها</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">درآمد {formatOverviewWindow(OVERVIEW_WINDOW_DAYS)}</CardTitle>
            <CardDescription>
              مجموع پرداخت‌های موفق ثبت شده در بازه بررسی.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-4xl font-bold">{formatRials(revenueLast30Days)}</div>
              <p className="text-xs text-muted-foreground">
                {formatNumber(paidPaymentsLast30Days)} پرداخت موفق ثبت شده است.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/billing/payments">مشاهده پرداخت‌ها</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">پرداخت‌های در انتظار</CardTitle>
            <CardDescription>
              پرداخت‌هایی که هنوز وضعیت نهایی ندارند.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-4xl font-bold">{formatNumber(pendingPaymentsCount)}</div>
              <p className="text-xs text-muted-foreground">
                {formatNumber(invoicesLast30Days)} فاکتور در {formatOverviewWindow(
                  OVERVIEW_WINDOW_DAYS,
                )} صادر شده است.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/billing/invoices">بررسی فاکتورها</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">دسترسی‌های فعال</CardTitle>
            <CardDescription>
              وضعیت دسترسی انتشار پروفایل و اعتبار آگهی شغلی.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-4xl font-bold">{formatNumber(activePublishEntitlements)}</div>
              <p className="text-xs text-muted-foreground">
                مجموع اعتبار آگهی باقی‌مانده: {formatNumber(remainingJobCredits)}
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/billing/entitlements">مدیریت دسترسی‌ها</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle className="text-lg">آخرین پرداخت‌ها</CardTitle>
            <CardDescription>
              جدیدترین تراکنش‌های ثبت شده در سیستم.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">پرداختی ثبت نشده است.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 font-medium">کاربر</th>
                      <th className="px-3 py-2 font-medium">مبلغ</th>
                      <th className="px-3 py-2 font-medium">وضعیت</th>
                      <th className="px-3 py-2 font-medium">شناسه درگاه</th>
                      <th className="px-3 py-2 font-medium">تاریخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.map((payment) => {
                      const userName = payment.user.name ?? payment.user.email;
                      const createdLabel = formatJalaliDateTime(payment.createdAt);
                      const invoiceNumber = payment.invoice?.number ?? "—";
                      return (
                        <tr key={payment.id} className="border-b border-border/60">
                          <td className="px-3 py-2">
                            <div className="space-y-1">
                              <div className="font-medium">{userName}</div>
                              <div className="font-mono text-xs text-muted-foreground">
                                {payment.user.email}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                فاکتور: {invoiceNumber}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2">{formatRials(payment.amount)}</td>
                          <td className="px-3 py-2">
                            <Badge variant={PAYMENT_STATUS_VARIANTS[payment.status]}>
                              {payment.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-mono text-xs text-muted-foreground break-all">
                              {payment.providerRef}
                            </div>
                          </td>
                          <td className="px-3 py-2">{createdLabel}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/billing/payments">نمایش همه پرداخت‌ها</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle className="text-lg">آخرین فاکتورها</CardTitle>
            <CardDescription>
              جدیدترین فاکتورهای صادر شده برای کاربران.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {recentInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">فاکتوری صادر نشده است.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 font-medium">شماره</th>
                      <th className="px-3 py-2 font-medium">کاربر</th>
                      <th className="px-3 py-2 font-medium">مبلغ</th>
                      <th className="px-3 py-2 font-medium">وضعیت</th>
                      <th className="px-3 py-2 font-medium">تاریخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.map((invoice) => {
                      const userName = invoice.user.name ?? invoice.user.email;
                      const issuedLabel = formatJalaliDateTime(invoice.issuedAt);
                      return (
                        <tr key={invoice.id} className="border-b border-border/60">
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                            {invoice.number}
                          </td>
                          <td className="px-3 py-2">
                            <div className="space-y-1">
                              <div className="font-medium">{userName}</div>
                              <div className="font-mono text-xs text-muted-foreground">
                                {invoice.user.email}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {invoice.payment?.provider ?? "—"}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2">{formatRials(invoice.total)}</td>
                          <td className="px-3 py-2">
                            <Badge variant={INVOICE_STATUS_VARIANTS[invoice.status]}>
                              {invoice.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">{issuedLabel}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/billing/invoices">نمایش همه فاکتورها</Link>
            </Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}

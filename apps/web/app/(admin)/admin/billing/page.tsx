import { SubscriptionStatus, PaymentStatus, InvoiceType } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

import { AdminBillingTabs } from "./_components/admin-billing-tabs";

export const dynamic = "force-dynamic";

async function getOverview() {
  const [activeSubscriptions, totalPayments, refundedPayments, refundInvoices] = await Promise.all([
    prisma.subscription.count({
      where: { status: { in: [SubscriptionStatus.active, SubscriptionStatus.renewing] } },
    }),
    prisma.payment.count({ where: { status: PaymentStatus.PAID } }),
    prisma.payment.count({ where: { status: PaymentStatus.REFUNDED } }),
    prisma.invoice.count({ where: { type: InvoiceType.REFUND } }),
  ]);

  return { activeSubscriptions, totalPayments, refundedPayments, refundInvoices };
}

export default async function AdminBillingOverviewPage() {
  const overview = await getOverview();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">داشبورد صورتحساب</h1>
        <p className="text-sm text-muted-foreground">
          وضعیت کلی اشتراک‌ها، پرداخت‌ها و فاکتورها را از اینجا مدیریت کنید.
        </p>
      </header>
      <AdminBillingTabs />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">اشتراک‌های فعال</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.activeSubscriptions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">پرداخت‌های موفق</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalPayments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">پرداخت‌های بازگشتی</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.refundedPayments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">یادداشت‌های اصلاحی</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.refundInvoices}</div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

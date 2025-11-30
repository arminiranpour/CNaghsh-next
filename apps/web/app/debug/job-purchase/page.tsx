// TODO: Remove this debug page before production.
// This page is only for testing and visually verifying job posting purchases.

import { PaymentStatus, ProductType } from "@prisma/client";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerAuthSession } from "@/lib/auth/session";
import { formatJalaliDateTime } from "@/lib/datetime/jalali";
import { formatRials } from "@/lib/money";
import { prisma } from "@/lib/prisma";

type PageProps = {
  searchParams?: { jobId?: string };
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PAID: "پرداخت شده",
  PENDING: "در انتظار",
  FAILED: "ناموفق",
  REFUNDED: "بازپرداخت کامل",
  REFUNDED_PARTIAL: "بازپرداخت جزئی",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function JobPurchaseDebugPage({ searchParams }: PageProps) {
  const jobId = searchParams?.jobId;

  if (!jobId) {
    return renderMessage("شناسه آگهی (jobId) در کوئری الزامی است.");
  }

  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/auth?tab=signin");
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      userId: true,
      createdAt: true,
    },
  });

  if (!job) {
    return renderMessage("آگهی مورد نظر یافت نشد.");
  }

  if (job.userId !== session.user.id) {
    return renderMessage("دسترسی به این آگهی برای شما مجاز نیست.");
  }

  const purchase = await prisma.payment.findFirst({
    where: {
      userId: job.userId,
      session: {
        price: {
          product: { type: ProductType.JOB_POST },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      checkoutSessionId: true,
      provider: true,
      providerRef: true,
      amount: true,
      currency: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      invoice: {
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
        },
      },
      session: {
        select: {
          id: true,
          createdAt: true,
          price: {
            select: {
              id: true,
              amount: true,
              currency: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const planLabel = purchase?.session?.price?.product?.name ?? "بسته اعتبارات آگهی";
  const formattedAmount = purchase
    ? `${formatRials(purchase.amount)} (${purchase.currency})`
    : "—";
  const paymentStatus = purchase ? PAYMENT_STATUS_LABELS[purchase.status] : "—";
  const paidAt = purchase ? formatJalaliDateTime(purchase.updatedAt ?? purchase.createdAt) : "—";
  const checkoutId = purchase?.checkoutSessionId ?? purchase?.session?.id ?? "—";
  const invoiceNumber = purchase?.invoice?.number ?? purchase?.invoice?.id ?? null;

  return (
    <div className="min-h-screen bg-muted/40 p-4" dir="rtl">
      <div className="mx-auto flex max-w-3xl items-center justify-center">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-[#FF7F19]">جزئیات خرید آگهی شغلی</CardTitle>
            <CardDescription>
              این صفحه فقط برای تست و بررسی نمایش اطلاعات خرید است.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="عنوان شغل" value={job.title} />
            <InfoRow label="شناسه شغل" value={job.id} />
            <InfoRow label="نوع خرید / پلن" value={planLabel} />
            <InfoRow label="مبلغ نهایی" value={formattedAmount} />
            <InfoRow label="وضعیت پرداخت" value={paymentStatus} />
            <InfoRow label="تاریخ خرید" value={paidAt} />
            <InfoRow
              label="شناسه پرداخت / تراکنش"
              value={purchase ? purchase.id : "—"}
            />
            <InfoRow label="شناسه جلسه پرداخت" value={checkoutId} />
            <InfoRow
              label="شناسه درگاه (providerRef)"
              value={purchase?.providerRef ?? "—"}
            />
            <InfoRow
              label="شناسه فاکتور"
              value={invoiceNumber ?? "—"}
            />
            {!purchase && (
              <div className="rounded-md border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                برای این آگهی خرید موفقی یافت نشد. خرید یکباره آگهی یا هم‌تراز آن در حساب این کاربر ثبت نشده است.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function renderMessage(message: string) {
  return (
    <div className="min-h-screen bg-muted/40 p-4" dir="rtl">
      <div className="mx-auto flex max-w-xl items-center justify-center">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-[#FF7F19]">نمایش خرید آگهی</CardTitle>
            <CardDescription>این صفحه تنها برای تست و بررسی است.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{message}</CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

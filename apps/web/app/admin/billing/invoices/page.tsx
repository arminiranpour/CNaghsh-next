import { Suspense } from "react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { formatJalaliDateTime } from "@/lib/datetime/jalali";
import { formatRials } from "@/lib/money";
import { listInvoices } from "@/lib/admin/billing/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/app/admin/billing/components/pagination";
import { ActionDialog } from "@/app/admin/billing/components/action-dialog";
import { resyncInvoiceNumberAction, voidInvoiceAction } from "./actions";
import { InvoiceStatus, InvoiceType } from "@prisma/client";

export const metadata: Metadata = {
  title: "مدیریت فاکتورها",
};

const EMPTY_FILTER_VALUE = "all";

const STATUS_OPTIONS: Array<{ value: typeof EMPTY_FILTER_VALUE | InvoiceStatus; label: string }> = [
  { value: EMPTY_FILTER_VALUE, label: "همه وضعیت‌ها" },
  { value: InvoiceStatus.DRAFT, label: "پیش‌فاکتور" },
  { value: InvoiceStatus.PAID, label: "پرداخت‌شده" },
  { value: InvoiceStatus.VOID, label: "باطل‌شده" },
  { value: InvoiceStatus.REFUNDED, label: "بازپرداخت‌شده" },
];

const TYPE_OPTIONS: Array<{ value: typeof EMPTY_FILTER_VALUE | InvoiceType; label: string }> = [
  { value: EMPTY_FILTER_VALUE, label: "همه انواع" },
  { value: InvoiceType.SALE, label: "فروش" },
  { value: InvoiceType.REFUND, label: "استرداد" },
];

const STATUS_BADGES: Record<InvoiceStatus, "outline" | "success" | "secondary" | "destructive"> = {
  [InvoiceStatus.DRAFT]: "outline",
  [InvoiceStatus.PAID]: "success",
  [InvoiceStatus.VOID]: "secondary",
  [InvoiceStatus.REFUNDED]: "outline",
};

type SearchParams = {
  status?: InvoiceStatus | typeof EMPTY_FILTER_VALUE;
  type?: InvoiceType | typeof EMPTY_FILTER_VALUE;
  q?: string;
  page?: string;
  from?: string;
  to?: string;
};

const PAGE_SIZE = 25;

function buildSelectValue(value?: string | null) {
  return value ?? EMPTY_FILTER_VALUE;
}

function buildStatusLabel(status: InvoiceStatus) {
  switch (status) {
    case InvoiceStatus.PAID:
      return "پرداخت‌شده";
    case InvoiceStatus.DRAFT:
      return "پیش‌فاکتور";
    case InvoiceStatus.REFUNDED:
      return "بازپرداخت‌شده";
    case InvoiceStatus.VOID:
      return "باطل‌شده";
    default:
      return status;
  }
}

function buildTypeLabel(type: InvoiceType) {
  switch (type) {
    case InvoiceType.SALE:
      return "فروش";
    case InvoiceType.REFUND:
      return "استرداد";
    default:
      return type;
  }
}

async function InvoicesTable({ searchParams }: { searchParams: SearchParams }) {
  const status = searchParams.status && Object.values(InvoiceStatus).includes(searchParams.status)
    ? searchParams.status
    : undefined;
  const type = searchParams.type && Object.values(InvoiceType).includes(searchParams.type)
    ? searchParams.type
    : undefined;

  const pageParam = Number.parseInt(searchParams.page ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const filters = {
    status,
    type,
    query: searchParams.q?.trim() || undefined,
    from: searchParams.from ? new Date(searchParams.from) : undefined,
    to: searchParams.to ? new Date(searchParams.to) : undefined,
  } as const;

  const list = await listInvoices({
    filters,
    pagination: { page, pageSize: PAGE_SIZE },
    sort: { field: "issuedAt", direction: "desc" },
  });

  const totalPages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));
  const invoices = list.items;
  const currentSearchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) {
      currentSearchParams.set(key, String(value));
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>فیلتر فاکتورها</CardTitle>
          <CardDescription>می‌توانید بر اساس وضعیت، تاریخ و عبارت جستجو لیست را محدود کنید.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-5" dir="rtl">
            <div className="space-y-2">
              <Label htmlFor="status">وضعیت</Label>
              <Select name="status" defaultValue={buildSelectValue(status)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="انتخاب وضعیت" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">نوع فاکتور</Label>
              <Select name="type" defaultValue={buildSelectValue(type)}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="نوع" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="from">از تاریخ</Label>
              <Input id="from" name="from" type="date" defaultValue={searchParams.from ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">تا تاریخ</Label>
              <Input id="to" name="to" type="date" defaultValue={searchParams.to ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q">جستجو (شماره یا ایمیل)</Label>
              <Input id="q" name="q" placeholder="مثلاً INV-... یا ایمیل" defaultValue={searchParams.q ?? ""} />
            </div>
            <div className="md:col-span-5 flex justify-end gap-2">
              <Button type="submit">اعمال فیلتر</Button>
              <Button type="reset" variant="outline" asChild>
                <Link href="/admin/billing/invoices">حذف فیلترها</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>فهرست فاکتورها</CardTitle>
          <CardDescription>دانلود فایل PDF، بازشماری شماره یا ابطال فاکتور.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invoices.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">فاکتوری مطابق فیلترها یافت نشد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm" dir="rtl">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-right font-medium">شماره</th>
                    <th className="px-3 py-2 text-right font-medium">کاربر</th>
                    <th className="px-3 py-2 text-right font-medium">نوع / وضعیت</th>
                    <th className="px-3 py-2 text-right font-medium">مبلغ</th>
                    <th className="px-3 py-2 text-right font-medium">تاریخ صدور</th>
                    <th className="px-3 py-2 text-right font-medium">اقدامات</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => {
                    const issuedLabel = formatJalaliDateTime(invoice.issuedAt);
                    const statusLabel = buildStatusLabel(invoice.status);
                    const typeLabel = buildTypeLabel(invoice.type);
                    const badgeVariant = STATUS_BADGES[invoice.status] ?? "outline";
                    const downloadUrl = invoice.status === "DRAFT" ? null : `/api/invoices/${invoice.id}/pdf`;
                    return (
                      <tr key={invoice.id} className="border-b border-border/60">
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                          {invoice.number ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="space-y-1">
                            <div className="font-medium">{invoice.user.name ?? invoice.user.email}</div>
                            <div className="font-mono text-xs text-muted-foreground">{invoice.user.email}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2 space-y-2">
                          <Badge variant="outline">{typeLabel}</Badge>
                          <Badge variant={badgeVariant}>{statusLabel}</Badge>
                        </td>
                        <td className="px-3 py-2">{formatRials(invoice.total)}</td>
                        <td className="px-3 py-2">{issuedLabel}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" asChild disabled={!downloadUrl}>
                              <Link
                                href={downloadUrl ?? "#"}
                                prefetch={false}
                                target="_blank"
                                rel="noopener"
                              >
                                دانلود PDF
                              </Link>
                            </Button>
                            <form action={resyncInvoiceNumberAction}>
                              <input type="hidden" name="id" value={invoice.id} />
                              <Button type="submit" variant="outline" size="sm">
                                بازشماری شماره
                              </Button>
                            </form>
                            <ActionDialog
                              title="ابطال فاکتور"
                              description="با ابطال فاکتور، وضعیت به باطل‌شده تغییر می‌کند."
                              triggerLabel="ابطال"
                              confirmLabel="تایید ابطال"
                              variant="destructive"
                              input={{ id: invoice.id }}
                              trigger={
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  disabled={invoice.status === InvoiceStatus.VOID}
                                >
                                  ابطال
                                </Button>
                              }
                              onSubmit={voidInvoiceAction}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            basePath={"/admin/billing/invoices" as Route}
            searchParams={currentSearchParams}
            page={page}
            totalPages={totalPages}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminInvoicesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-muted-foreground">در حال بارگذاری...</p>}>
      <InvoicesTable searchParams={searchParams} />
    </Suspense>
  );
}

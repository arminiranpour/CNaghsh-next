import { PaymentStatus, Provider } from "@prisma/client";
import type { Route } from "next";

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

import { listPayments } from "@/lib/admin/billing/queries";

import { PaginationControls } from "../components/pagination";
import { PaymentsTable } from "./payments-table";

const PAGE_PATH = "/admin/billing/payments" as Route;
const PAGE_SIZE = 25;

function parseNumber(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function parseDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function toSearchParams(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    } else if (typeof value === "string") {
      params.set(key, value);
    }
  }
  return params;
}

const statusOptions = [
  { value: "", label: "همه وضعیت‌ها" },
  { value: PaymentStatus.PAID, label: "پرداخت شده" },
  { value: PaymentStatus.PENDING, label: "در انتظار" },
  { value: PaymentStatus.FAILED, label: "ناموفق" },
  { value: PaymentStatus.REFUNDED, label: "بازپرداخت" },
];

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const statusParam = typeof searchParams.status === "string" ? searchParams.status : undefined;
  const providerParam = typeof searchParams.provider === "string" ? searchParams.provider : undefined;
  const queryParam = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const fromParam = typeof searchParams.from === "string" ? searchParams.from : undefined;
  const toParam = typeof searchParams.to === "string" ? searchParams.to : undefined;
  const minParam = typeof searchParams.min === "string" ? searchParams.min : undefined;
  const maxParam = typeof searchParams.max === "string" ? searchParams.max : undefined;
  const pageParam = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page, 10) : 1;

  const filters = {
    status:
      statusParam && Object.values(PaymentStatus).includes(statusParam as PaymentStatus)
        ? (statusParam as PaymentStatus)
        : undefined,
    provider:
      providerParam && Object.values(Provider).includes(providerParam as Provider)
        ? (providerParam as Provider)
        : undefined,
    from: parseDate(fromParam),
    to: parseDate(toParam),
    minAmount: parseNumber(minParam),
    maxAmount: parseNumber(maxParam),
    query: queryParam?.trim() || undefined,
  } as const;

  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const list = await listPayments({
    filters,
    pagination: { page, pageSize: PAGE_SIZE },
    sort: { field: "createdAt", direction: "desc" },
  });

  const rows = list.items.map((payment) => ({
    id: payment.id,
    userId: payment.userId,
    userEmail: payment.user.email,
    userName: payment.user.name ?? payment.user.email,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    provider: payment.provider,
    providerRef: payment.providerRef,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
    invoice: payment.invoice
      ? {
          id: payment.invoice.id,
          number: payment.invoice.number,
          status: payment.invoice.status,
          total: payment.invoice.total,
        }
      : null,
  }));

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const params = toSearchParams(searchParams);

  return (
    <div className="space-y-6" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">مدیریت پرداخت‌ها</h1>
        <p className="text-sm text-muted-foreground">
          پرداخت‌ها را بررسی و در صورت نیاز بازپرداخت یا اصلاح وضعیت انجام دهید.
        </p>
      </header>

      <form className="rounded-lg border border-border bg-background p-4" dir="rtl" method="get">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="q">جستجو (ایمیل یا شناسه درگاه)</Label>
            <Input id="q" name="q" defaultValue={queryParam ?? ""} placeholder="مثلاً ref-123" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">وضعیت</Label>
            <Select name="status" defaultValue={statusParam ?? ""}>
              <SelectTrigger id="status">
                <SelectValue placeholder="همه وضعیت‌ها" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value || "all"} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider">درگاه</Label>
            <Select name="provider" defaultValue={providerParam ?? ""}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="همه درگاه‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">همه درگاه‌ها</SelectItem>
                {Object.values(Provider).map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
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
          <div className="space-y-2">
            <Label htmlFor="min">حداقل مبلغ (ریال)</Label>
            <Input id="min" name="min" type="number" defaultValue={minParam ?? ""} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max">حداکثر مبلغ (ریال)</Label>
            <Input id="max" name="max" type="number" defaultValue={maxParam ?? ""} dir="ltr" />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="submit">اعمال فیلتر</Button>
          <Button type="reset" variant="outline">
            پاکسازی
          </Button>
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          پرداختی مطابق فیلترهای فعلی یافت نشد.
        </div>
      ) : (
        <PaymentsTable rows={rows} />
      )}

      <PaginationControls basePath={PAGE_PATH} searchParams={params} page={page} totalPages={totalPages} />
    </div>
  );
}

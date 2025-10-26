import type { PaymentStatus, Provider } from "@prisma/client";

export const dynamic = "force-dynamic";

import { AdminBillingTabs } from "../_components/admin-billing-tabs";
import { PaginationControls } from "../_components/pagination-controls";
import { PaymentFilters } from "../_components/payment-filters";
import { PaymentTable, type PaymentRow } from "../_components/payment-table";
import { listPayments } from "@/lib/admin/billingQueries";

type SearchParams = Record<string, string | string[] | undefined>;

type ParsedFilters = {
  q?: string;
  provider?: Provider;
  status?: PaymentStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  raw: {
    q?: string;
    provider?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  };
};

function getParam(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  if (!value) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

function parseDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

const PROVIDER_VALUES = new Set<Provider>(["zarinpal", "idpay", "nextpay"]);
const STATUS_VALUES = new Set<PaymentStatus>(["PENDING", "PAID", "FAILED", "REFUNDED"]);

function parseFilters(searchParams: SearchParams): ParsedFilters {
  const q = getParam(searchParams, "q") ?? undefined;
  const providerRaw = getParam(searchParams, "provider") ?? undefined;
  const statusRaw = getParam(searchParams, "status") ?? undefined;
  const dateFromRaw = getParam(searchParams, "dateFrom") ?? undefined;
  const dateToRaw = getParam(searchParams, "dateTo") ?? undefined;
  const pageRaw = getParam(searchParams, "page") ?? "1";

  const page = Number.parseInt(pageRaw, 10);
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;

  const provider = providerRaw && PROVIDER_VALUES.has(providerRaw as Provider) ? (providerRaw as Provider) : undefined;
  const status = statusRaw && STATUS_VALUES.has(statusRaw as PaymentStatus) ? (statusRaw as PaymentStatus) : undefined;
  const dateFrom = parseDate(dateFromRaw);
  const dateTo = parseDate(dateToRaw);

  return {
    q: q?.trim() ? q.trim() : undefined,
    provider,
    status,
    dateFrom,
    dateTo,
    page: safePage,
    raw: {
      q: q ?? undefined,
      provider: providerRaw ?? undefined,
      status: statusRaw ?? undefined,
      dateFrom: dateFromRaw ?? undefined,
      dateTo: dateToRaw ?? undefined,
    },
  };
}

export default async function AdminBillingPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(searchParams);

  const result = await listPayments({
    q: filters.q,
    provider: filters.provider ?? null,
    status: filters.status ?? null,
    dateFrom: filters.dateFrom ?? null,
    dateTo: filters.dateTo ?? null,
    page: filters.page,
    pageSize: 20,
  });

  const rows: PaymentRow[] = result.rows.map((item) => ({
    id: item.id,
    userEmail: item.user.email ?? "",
    userName: item.user.name,
    provider: item.provider,
    providerRef: item.providerRef,
    amount: item.amount,
    currency: item.currency,
    status: item.status,
    createdAt: item.createdAt.toISOString(),
    invoiceId: item.invoice?.id ?? null,
    invoiceNumber: item.invoice?.number ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">مدیریت پرداخت‌ها</h2>
        <p className="text-sm text-muted-foreground">نمایش و بازگشت پرداخت‌ها.</p>
      </header>
      <AdminBillingTabs />
      <PaymentFilters
        defaultValues={{
          q: filters.raw.q,
          provider: filters.raw.provider,
          status: filters.raw.status,
          dateFrom: filters.raw.dateFrom,
          dateTo: filters.raw.dateTo,
        }}
      />
      <PaymentTable rows={rows} />
      <PaginationControls
        pathname="/admin/billing/payments"
        page={filters.page}
        hasPrevious={result.pageInfo.hasPreviousPage}
        hasNext={result.pageInfo.hasNextPage}
        query={filters.raw}
      />
    </div>
  );
}

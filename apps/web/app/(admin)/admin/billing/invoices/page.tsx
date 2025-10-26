import type { InvoiceStatus, InvoiceType } from "@prisma/client";

export const dynamic = "force-dynamic";

import { AdminBillingTabs } from "../_components/admin-billing-tabs";
import { InvoiceExportButton } from "../_components/invoice-export-button";
import { InvoiceFilters } from "../_components/invoice-filters";
import { InvoiceTable, type InvoiceRow } from "../_components/invoice-table";
import { PaginationControls } from "../_components/pagination-controls";
import { listInvoices } from "@/lib/admin/billingQueries";

type SearchParams = Record<string, string | string[] | undefined>;

type ParsedFilters = {
  q?: string;
  type?: InvoiceType;
  status?: InvoiceStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  raw: {
    q?: string;
    type?: string;
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

const TYPE_VALUES = new Set<InvoiceType>(["SALE", "REFUND"]);
const STATUS_VALUES = new Set<InvoiceStatus>(["PAID", "OPEN", "VOID"]);

function parseFilters(searchParams: SearchParams): ParsedFilters {
  const q = getParam(searchParams, "q") ?? undefined;
  const typeRaw = getParam(searchParams, "type") ?? undefined;
  const statusRaw = getParam(searchParams, "status") ?? undefined;
  const dateFromRaw = getParam(searchParams, "dateFrom") ?? undefined;
  const dateToRaw = getParam(searchParams, "dateTo") ?? undefined;
  const pageRaw = getParam(searchParams, "page") ?? "1";

  const page = Number.parseInt(pageRaw, 10);
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;

  const type = typeRaw && TYPE_VALUES.has(typeRaw as InvoiceType) ? (typeRaw as InvoiceType) : undefined;
  const status = statusRaw && STATUS_VALUES.has(statusRaw as InvoiceStatus) ? (statusRaw as InvoiceStatus) : undefined;
  const dateFrom = parseDate(dateFromRaw);
  const dateTo = parseDate(dateToRaw);

  return {
    q: q?.trim() ? q.trim() : undefined,
    type,
    status,
    dateFrom,
    dateTo,
    page: safePage,
    raw: {
      q: q ?? undefined,
      type: typeRaw ?? undefined,
      status: statusRaw ?? undefined,
      dateFrom: dateFromRaw ?? undefined,
      dateTo: dateToRaw ?? undefined,
    },
  };
}

export default async function AdminBillingInvoicesPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(searchParams);

  const result = await listInvoices({
    q: filters.q,
    type: filters.type ?? null,
    status: filters.status ?? null,
    dateFrom: filters.dateFrom ?? null,
    dateTo: filters.dateTo ?? null,
    page: filters.page,
    pageSize: 20,
  });

  const rows: InvoiceRow[] = result.rows.map((item) => ({
    id: item.id,
    number: item.number,
    userEmail: item.user.email ?? "",
    userName: item.user.name,
    type: item.type,
    total: item.total,
    currency: item.currency,
    issuedAt: item.issuedAt.toISOString(),
    status: item.status,
    providerRef: item.providerRef ?? item.payment?.providerRef ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">مدیریت فاکتورها</h2>
        <p className="text-sm text-muted-foreground">پیگیری فاکتورها و خروجی CSV.</p>
      </header>
      <AdminBillingTabs />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <InvoiceFilters
          defaultValues={{
            q: filters.raw.q,
            type: filters.raw.type,
            status: filters.raw.status,
            dateFrom: filters.raw.dateFrom,
            dateTo: filters.raw.dateTo,
          }}
        />
        <InvoiceExportButton query={filters.raw} />
      </div>
      <InvoiceTable rows={rows} />
      <PaginationControls
        pathname="/admin/billing/invoices"
        page={filters.page}
        hasPrevious={result.pageInfo.hasPreviousPage}
        hasNext={result.pageInfo.hasNextPage}
        query={filters.raw}
      />
    </div>
  );
}

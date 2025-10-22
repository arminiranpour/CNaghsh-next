import type { SubscriptionStatus } from "@prisma/client";

import { AdminBillingTabs } from "../_components/admin-billing-tabs";
import { PaginationControls } from "../_components/pagination-controls";
import { SubscriptionFilters } from "../_components/subscription-filters";
import { SubscriptionTable, type SubscriptionRow } from "../_components/subscription-table";
import { listSubscriptions } from "@/lib/admin/billingQueries";
import { prisma } from "@/lib/prisma";

type SearchParams = Record<string, string | string[] | undefined>;

type ParsedFilters = {
  q?: string;
  status?: SubscriptionStatus;
  planId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  raw: {
    q?: string;
    status?: string;
    planId?: string;
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

function parseFilters(searchParams: SearchParams): ParsedFilters {
  const q = getParam(searchParams, "q") ?? undefined;
  const statusRaw = getParam(searchParams, "status") ?? undefined;
  const planId = getParam(searchParams, "planId") ?? undefined;
  const dateFromRaw = getParam(searchParams, "dateFrom") ?? undefined;
  const dateToRaw = getParam(searchParams, "dateTo") ?? undefined;
  const pageRaw = getParam(searchParams, "page") ?? "1";

  const page = Number.parseInt(pageRaw, 10);
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;

  let status: SubscriptionStatus | undefined;
  if (statusRaw === "active" || statusRaw === "expired" || statusRaw === "canceled" || statusRaw === "renewing") {
    status = statusRaw;
  }

  const dateFrom = parseDate(dateFromRaw ?? undefined);
  const dateTo = parseDate(dateToRaw ?? undefined);

  return {
    q: q?.trim() ? q.trim() : undefined,
    status,
    planId: planId?.trim() ? planId.trim() : undefined,
    dateFrom,
    dateTo,
    page: safePage,
    raw: {
      q: q ?? undefined,
      status: statusRaw ?? undefined,
      planId: planId ?? undefined,
      dateFrom: dateFromRaw ?? undefined,
      dateTo: dateToRaw ?? undefined,
    },
  };
}

export default async function AdminBillingSubscriptionsPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(searchParams);

  const [plans, subscriptionResult] = await Promise.all([
    prisma.plan.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    listSubscriptions({
      q: filters.q,
      status: filters.status ?? null,
      planId: filters.planId ?? null,
      dateFrom: filters.dateFrom ?? null,
      dateTo: filters.dateTo ?? null,
      page: filters.page,
      pageSize: 20,
    }),
  ]);

  const now = new Date();
  const rows: SubscriptionRow[] = subscriptionResult.rows.map((item) => {
    const entitlement = item.user.entitlements[0] ?? null;
    const activeEntitlement =
      !!entitlement && (!entitlement.expiresAt || entitlement.expiresAt.getTime() > now.getTime());

    return {
      id: item.id,
      userId: item.userId,
      userEmail: item.user.email ?? "",
      userName: item.user.name,
      planName: item.plan.name,
      status: item.status,
      endsAt: item.endsAt.toISOString(),
      cancelAtPeriodEnd: item.cancelAtPeriodEnd,
      updatedAt: item.updatedAt.toISOString(),
      providerRef: item.providerRef ?? null,
      hasEntitlement: activeEntitlement,
      entitlementExpiresAt: entitlement?.expiresAt?.toISOString() ?? null,
    } satisfies SubscriptionRow;
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">مدیریت اشتراک‌ها</h2>
        <p className="text-sm text-muted-foreground">کنترل اشتراک‌ها و دسترسی کاربران.</p>
      </header>
      <AdminBillingTabs />
      <SubscriptionFilters
        defaultValues={{
          q: filters.raw.q,
          status: filters.raw.status,
          planId: filters.raw.planId,
          dateFrom: filters.raw.dateFrom,
          dateTo: filters.raw.dateTo,
        }}
        plans={plans.map((plan) => ({ value: plan.id, label: plan.name }))}
      />
      <SubscriptionTable rows={rows} />
      <PaginationControls
        pathname="/admin/billing/subscriptions"
        page={filters.page}
        hasPrevious={subscriptionResult.pageInfo.hasPreviousPage}
        hasNext={subscriptionResult.pageInfo.hasNextPage}
        query={filters.raw}
      />
    </div>
  );
}

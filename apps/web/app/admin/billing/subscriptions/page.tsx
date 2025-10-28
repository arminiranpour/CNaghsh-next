import { Provider, SubscriptionStatus } from "@prisma/client";
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
import { prisma } from "@/lib/db";
import { PaginationControls } from "../components/pagination";
import { listSubscriptions } from "@/lib/admin/billing/queries";
import { SubscriptionsTable } from "./subscriptions-table";

const PAGE_PATH = "/admin/billing/subscriptions" as Route;
const PAGE_SIZE = 25;

function parseBoolean(value: string | undefined) {
  if (!value) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function parseDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function toUrlSearchParams(searchParams: Record<string, string | string[] | undefined>) {
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
  { value: SubscriptionStatus.active, label: "فعال" },
  { value: SubscriptionStatus.renewing, label: "در حال تمدید" },
  { value: SubscriptionStatus.canceled, label: "لغو شده" },
  { value: SubscriptionStatus.expired, label: "منقضی" },
];

const cancelOptions = [
  { value: "", label: "وضعیت لغو" },
  { value: "true", label: "فعال" },
  { value: "false", label: "غیرفعال" },
];

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const statusParam = typeof searchParams.status === "string" ? searchParams.status : undefined;
  const planParam = typeof searchParams.plan === "string" ? searchParams.plan : undefined;
  const providerParam = typeof searchParams.provider === "string" ? searchParams.provider : undefined;
  const cancelParam = typeof searchParams.cancel === "string" ? searchParams.cancel : undefined;
  const queryParam = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const startedFromParam = typeof searchParams.startedFrom === "string" ? searchParams.startedFrom : undefined;
  const startedToParam = typeof searchParams.startedTo === "string" ? searchParams.startedTo : undefined;
  const endsFromParam = typeof searchParams.endsFrom === "string" ? searchParams.endsFrom : undefined;
  const endsToParam = typeof searchParams.endsTo === "string" ? searchParams.endsTo : undefined;
  const pageParam = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page, 10) : 1;

  const filters = {
    status:
      statusParam === SubscriptionStatus.active ||
      statusParam === SubscriptionStatus.renewing ||
      statusParam === SubscriptionStatus.canceled ||
      statusParam === SubscriptionStatus.expired
        ? (statusParam as SubscriptionStatus)
        : undefined,
    planId: planParam && planParam !== "all" ? planParam : undefined,
    provider:
      providerParam && Object.values(Provider).includes(providerParam as Provider)
        ? (providerParam as Provider)
        : undefined,
    cancelAtPeriodEnd: parseBoolean(cancelParam),
    startedFrom: parseDate(startedFromParam),
    startedTo: parseDate(startedToParam),
    endsFrom: parseDate(endsFromParam),
    endsTo: parseDate(endsToParam),
    query: queryParam?.trim() || undefined,
  } as const;

  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const [plans, list] = await Promise.all([
    prisma.plan.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    listSubscriptions({ filters, pagination: { page, pageSize: PAGE_SIZE }, sort: { field: "createdAt", direction: "desc" } }),
  ]);

  const rows = list.items.map((item) => ({
    id: item.id,
    userId: item.userId,
    userEmail: item.user.email,
    userName: item.user.name ?? item.user.email,
    planName: item.plan.name,
    planId: item.plan.id,
    status: item.status,
    startedAt: item.startedAt.toISOString(),
    endsAt: item.endsAt.toISOString(),
    renewalAt: item.renewalAt ? item.renewalAt.toISOString() : null,
    cancelAtPeriodEnd: item.cancelAtPeriodEnd,
    providerRef: item.providerRef ?? null,
    updatedAt: item.updatedAt.toISOString(),
    latestPayment: item.latestPayment
      ? {
          ...item.latestPayment,
          createdAt: item.latestPayment.createdAt.toISOString(),
        }
      : null,
  }));

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const params = toUrlSearchParams(searchParams);

  return (
    <div className="space-y-6" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">مدیریت اشتراک‌ها</h1>
        <p className="text-sm text-muted-foreground">
          جستجو، فیلتر و کنترل اشتراک‌های کاربران. تاریخ‌ها به تقویم جلالی نمایش داده می‌شود.
        </p>
      </header>

      <form className="rounded-lg border border-border bg-background p-4" dir="rtl" method="get">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="q">جستجو (ایمیل یا شناسه پرداخت)</Label>
            <Input id="q" name="q" defaultValue={queryParam ?? ""} placeholder="مثلاً user@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">وضعیت</Label>
            <Select name="status" defaultValue={statusParam ?? ""}>
              <SelectTrigger id="status">
                <SelectValue placeholder="همه وضعیت‌ها" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value || "all"} value={option.value ?? ""}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan">پلن</Label>
            <Select name="plan" defaultValue={planParam ?? ""}>
              <SelectTrigger id="plan">
                <SelectValue placeholder="همه پلن‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">همه پلن‌ها</SelectItem>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider">درگاه پرداخت</Label>
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
            <Label htmlFor="cancel">لغو در پایان دوره</Label>
            <Select name="cancel" defaultValue={cancelParam ?? ""}>
              <SelectTrigger id="cancel">
                <SelectValue placeholder="وضعیت لغو" />
              </SelectTrigger>
              <SelectContent>
                {cancelOptions.map((option) => (
                  <SelectItem key={option.value || "all"} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="startedFrom">شروع از</Label>
            <Input id="startedFrom" name="startedFrom" type="date" defaultValue={startedFromParam ?? ""} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startedTo">شروع تا</Label>
            <Input id="startedTo" name="startedTo" type="date" defaultValue={startedToParam ?? ""} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endsFrom">پایان از</Label>
            <Input id="endsFrom" name="endsFrom" type="date" defaultValue={endsFromParam ?? ""} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endsTo">پایان تا</Label>
            <Input id="endsTo" name="endsTo" type="date" defaultValue={endsToParam ?? ""} dir="ltr" />
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
          هیچ اشتراکی مطابق فیلترهای فعلی یافت نشد.
        </div>
      ) : (
        <SubscriptionsTable rows={rows} />
      )}

      <PaginationControls basePath={PAGE_PATH} searchParams={params} page={page} totalPages={totalPages} />
    </div>
  );
}

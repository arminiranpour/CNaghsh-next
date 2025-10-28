"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_SELECT_OPTION_VALUE, normalizeSelectValue } from "@/lib/select";

const ALL_OPTION_VALUE = "all" as const;

function normalizeOptionValue(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed === ALL_OPTION_VALUE || trimmed === ALL_SELECT_OPTION_VALUE) {
    return undefined;
  }

  return trimmed;
}

const STATUS_OPTIONS = [
  { value: ALL_OPTION_VALUE, label: "همه وضعیت‌ها" },
  { value: "active", label: "Active" },
  { value: "renewing", label: "Renewing" },
  { value: "expired", label: "Expired" },
  { value: "canceled", label: "Canceled" },
] as const;

type Option = { value: string; label: string };

type Props = {
  defaultValues: {
    q?: string;
    status?: string;
    planId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  plans: Option[];
};

export function SubscriptionFilters({ defaultValues, plans }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const filteredPlans = plans.reduce<Option[]>((acc, plan) => {
    const value = normalizeOptionValue(plan.value);
    if (!value) {
      return acc;
    }

    acc.push({ ...plan, value });
    return acc;
  }, []);

  const [search, setSearch] = useState(defaultValues.q ?? "");
  const [status, setStatus] = useState<string | undefined>(() =>
    normalizeSelectValue(defaultValues.status),
  );
  const [planId, setPlanId] = useState<string | undefined>(() =>
    normalizeSelectValue(defaultValues.planId),
  );
  const [dateFrom, setDateFrom] = useState(defaultValues.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(defaultValues.dateTo ?? "");

  const submit = () => {
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("q", search.trim());
    }
    const normalizedStatus = normalizeSelectValue(status);
    if (normalizedStatus) {
      params.set("status", normalizedStatus);
    }
    const normalizedPlanId = normalizeSelectValue(planId);
    if (normalizedPlanId) {
      params.set("planId", normalizedPlanId);
    }
    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }
    if (dateTo) {
      params.set("dateTo", dateTo);
    }
    params.set("page", "1");

    startTransition(() => {
      router.push(`/admin/billing/subscriptions${params.toString() ? `?${params.toString()}` : ""}`);
    });
  };

  const handleReset = () => {
    setSearch("");
    setStatus(undefined);
    setPlanId(undefined);
    setDateFrom("");
    setDateTo("");
    startTransition(() => {
      router.push("/admin/billing/subscriptions");
    });
  };

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label className="mb-2 block text-xs font-medium text-muted-foreground" htmlFor="subscription-search">
            جستجو
          </label>
          <Input
            id="subscription-search"
            placeholder="ایمیل کاربر یا مرجع ارائه‌دهنده"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">وضعیت</label>
          <Select
            value={status ?? ALL_OPTION_VALUE}
            onValueChange={(value) => setStatus(normalizeSelectValue(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="همه وضعیت‌ها" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">پلن</label>
          <Select
            value={planId ?? ALL_OPTION_VALUE}
            onValueChange={(value) => setPlanId(normalizeSelectValue(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="همه پلن‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_OPTION_VALUE}>همه پلن‌ها</SelectItem>
              {filteredPlans.map((plan) => (
                <SelectItem key={plan.value} value={plan.value}>
                  {plan.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground" htmlFor="subscription-date-from">
            از تاریخ
          </label>
          <Input
            id="subscription-date-from"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground" htmlFor="subscription-date-to">
            تا تاریخ
          </label>
          <Input
            id="subscription-date-to"
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={submit} disabled={isPending}>
          اعمال فیلتر
        </Button>
        <Button size="sm" variant="outline" onClick={handleReset} disabled={isPending}>
          پاک‌سازی
        </Button>
      </div>
    </div>
  );
}

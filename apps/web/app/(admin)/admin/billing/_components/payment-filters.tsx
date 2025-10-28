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

const ALL_OPTION_VALUE = ALL_SELECT_OPTION_VALUE;

function normalizeOptionValue(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const PROVIDER_OPTIONS = [
  { value: ALL_OPTION_VALUE, label: "همه ارائه‌دهندگان" },
  { value: "zarinpal", label: "Zarinpal" },
  { value: "idpay", label: "IDPay" },
  { value: "nextpay", label: "NextPay" },
] as const;

const STATUS_OPTIONS = [
  { value: ALL_OPTION_VALUE, label: "همه وضعیت‌ها" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
] as const;

type Props = {
  defaultValues: {
    q?: string;
    provider?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  };
};

export function PaymentFilters({ defaultValues }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(defaultValues.q ?? "");
  const [provider, setProvider] = useState<string | undefined>(() =>
    normalizeSelectValue(defaultValues.provider)
  );
  const [status, setStatus] = useState<string | undefined>(() =>
    normalizeSelectValue(defaultValues.status)
  );
  const [dateFrom, setDateFrom] = useState(defaultValues.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(defaultValues.dateTo ?? "");

  const submit = () => {
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("q", search.trim());
    }
    const normalizedProvider = normalizeSelectValue(provider);
    if (normalizedProvider) {
      params.set("provider", normalizedProvider);
    }
    const normalizedStatus = normalizeSelectValue(status);
    if (normalizedStatus) {
      params.set("status", normalizedStatus);
    }
    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }
    if (dateTo) {
      params.set("dateTo", dateTo);
    }
    params.set("page", "1");

    startTransition(() => {
      router.push(`/admin/billing/payments${params.toString() ? `?${params.toString()}` : ""}`);
    });
  };

  const reset = () => {
    setSearch("");
    setProvider(undefined);
    setStatus(undefined);
    setDateFrom("");
    setDateTo("");
    startTransition(() => {
      router.push("/admin/billing/payments");
    });
  };

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label className="mb-2 block text-xs font-medium text-muted-foreground" htmlFor="payment-search">
            جستجو
          </label>
          <Input
            id="payment-search"
            placeholder="ایمیل کاربر یا مرجع پرداخت"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">ارائه‌دهنده</label>
          <Select
            value={provider ?? ALL_OPTION_VALUE}
            onValueChange={(value) => setProvider(normalizeSelectValue(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="همه" />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_OPTIONS.map((option) => {
                const value = normalizeOptionValue(option.value);
                if (!value) {
                  return null;
                }

                return (
                  <SelectItem key={value} value={value}>
                    {option.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">وضعیت</label>
          <Select
            value={status ?? ALL_OPTION_VALUE}
            onValueChange={(value) => setStatus(normalizeSelectValue(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="همه" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => {
                const value = normalizeOptionValue(option.value);
                if (!value) {
                  return null;
                }

                return (
                  <SelectItem key={value} value={value}>
                    {option.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground" htmlFor="payment-date-from">
            از تاریخ
          </label>
          <Input
            id="payment-date-from"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground" htmlFor="payment-date-to">
            تا تاریخ
          </label>
          <Input
            id="payment-date-to"
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
        <Button size="sm" variant="outline" onClick={reset} disabled={isPending}>
          پاک‌سازی
        </Button>
      </div>
    </div>
  );
}

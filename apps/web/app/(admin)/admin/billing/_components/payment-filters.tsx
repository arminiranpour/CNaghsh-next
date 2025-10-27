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

const ALL_OPTION_VALUE = "all";

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
  const [provider, setProvider] = useState(
    defaultValues.provider && defaultValues.provider.length > 0
      ? defaultValues.provider
      : ALL_OPTION_VALUE
  );
  const [status, setStatus] = useState(
    defaultValues.status && defaultValues.status.length > 0
      ? defaultValues.status
      : ALL_OPTION_VALUE
  );
  const [dateFrom, setDateFrom] = useState(defaultValues.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(defaultValues.dateTo ?? "");

  const submit = () => {
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("q", search.trim());
    }
    if (provider && provider !== ALL_OPTION_VALUE) {
      params.set("provider", provider);
    }
    if (status && status !== ALL_OPTION_VALUE) {
      params.set("status", status);
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
    setProvider(ALL_OPTION_VALUE);
    setStatus(ALL_OPTION_VALUE);
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
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger>
              <SelectValue placeholder="همه" />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">وضعیت</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="همه" />
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

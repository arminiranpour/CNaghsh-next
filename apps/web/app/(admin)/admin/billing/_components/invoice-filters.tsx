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

const isValidOption = (option: { value: string }) => option.value.trim().length > 0;

type Props = {
  defaultValues: {
    q?: string;
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  };
};

const TYPE_OPTIONS = [
  { value: ALL_OPTION_VALUE, label: "همه نوع‌ها" },
  { value: "SALE", label: "Sale" },
  { value: "REFUND", label: "Refund" },
] as const;

const STATUS_OPTIONS = [
  { value: ALL_OPTION_VALUE, label: "همه وضعیت‌ها" },
  { value: "PAID", label: "Paid" },
  { value: "OPEN", label: "Open" },
  { value: "VOID", label: "Void" },
] as const;

export function InvoiceFilters({ defaultValues }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(defaultValues.q ?? "");
  const [type, setType] = useState(
    defaultValues.type && defaultValues.type.length > 0
      ? defaultValues.type
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
    if (type && type !== ALL_OPTION_VALUE) {
      params.set("type", type);
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
      router.push(`/admin/billing/invoices${params.toString() ? `?${params.toString()}` : ""}`);
    });
  };

  const reset = () => {
    setSearch("");
    setType(ALL_OPTION_VALUE);
    setStatus(ALL_OPTION_VALUE);
    setDateFrom("");
    setDateTo("");
    startTransition(() => {
      router.push("/admin/billing/invoices");
    });
  };

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label className="mb-2 block text-xs font-medium text-muted-foreground" htmlFor="invoice-search">
            جستجو
          </label>
          <Input
            id="invoice-search"
            placeholder="شماره فاکتور یا ایمیل"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">نوع</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="همه" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.filter(isValidOption).map((option) => (
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
              {STATUS_OPTIONS.filter(isValidOption).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground" htmlFor="invoice-date-from">
            از تاریخ
          </label>
          <Input
            id="invoice-date-from"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground" htmlFor="invoice-date-to">
            تا تاریخ
          </label>
          <Input
            id="invoice-date-to"
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

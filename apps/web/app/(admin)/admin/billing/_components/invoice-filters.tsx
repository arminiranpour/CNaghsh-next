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
  { value: "", label: "همه نوع‌ها" },
  { value: "SALE", label: "Sale" },
  { value: "REFUND", label: "Refund" },
] as const;

const STATUS_OPTIONS = [
  { value: "", label: "همه وضعیت‌ها" },
  { value: "PAID", label: "Paid" },
  { value: "OPEN", label: "Open" },
  { value: "VOID", label: "Void" },
] as const;

export function InvoiceFilters({ defaultValues }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(defaultValues.q ?? "");
  const [type, setType] = useState(defaultValues.type ?? "");
  const [status, setStatus] = useState(defaultValues.status ?? "");
  const [dateFrom, setDateFrom] = useState(defaultValues.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(defaultValues.dateTo ?? "");

  const submit = () => {
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("q", search.trim());
    }
    if (type) {
      params.set("type", type);
    }
    if (status) {
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
    setType("");
    setStatus("");
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
              {TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value || "all"} value={option.value}>
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
                <SelectItem key={option.value || "all"} value={option.value}>
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

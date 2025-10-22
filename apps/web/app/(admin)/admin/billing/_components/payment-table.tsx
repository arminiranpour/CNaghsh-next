"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { PaymentStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

const AMOUNT_FORMATTER = new Intl.NumberFormat("fa-IR");
const DATE_FORMATTER = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" });

export type PaymentRow = {
  id: string;
  userEmail: string;
  userName: string | null;
  provider: string;
  providerRef: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
};

type Props = {
  rows: PaymentRow[];
};

function statusVariant(status: PaymentStatus): "secondary" | "success" | "destructive" | "warning" {
  switch (status) {
    case "PAID":
      return "success";
    case "REFUNDED":
      return "warning";
    case "FAILED":
      return "destructive";
    default:
      return "secondary";
  }
}

async function postJson(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = (payload && typeof payload.error === "string" && payload.error) || "درخواست ناموفق بود";
    throw new Error(message);
  }

  return response.json();
}

function RefundDialog({
  paymentId,
  providerRef,
  amount,
  disabled,
}: {
  paymentId: string;
  providerRef: string;
  amount: number;
  disabled: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [inputAmount, setInputAmount] = useState(amount);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (inputAmount <= 0) {
      toast({ variant: "destructive", title: "خطا", description: "مبلغ بازگشت باید بیشتر از صفر باشد." });
      return;
    }

    startTransition(() => {
      postJson(`/api/admin/payments/${paymentId}/refund`, { amount: inputAmount })
        .then(() => {
          toast({ title: "بازگشت ثبت شد." });
          setOpen(false);
          router.refresh();
        })
        .catch((error: unknown) => {
          toast({ variant: "destructive", title: "خطا", description: error instanceof Error ? error.message : undefined });
        });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled || isPending}>
          بازگشت
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ثبت بازگشت وجه</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">مرجع پرداخت: {providerRef}</p>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor={`refund-amount-${paymentId}`}>
              مبلغ بازگشت (ریال)
            </label>
            <Input
              id={`refund-amount-${paymentId}`}
              type="number"
              min={1}
              value={inputAmount}
              onChange={(event) => setInputAmount(Number.parseInt(event.target.value, 10) || 0)}
            />
          </div>
        </div>
        <DialogFooter className="mt-6 flex flex-row-reverse gap-2">
          <Button onClick={handleSubmit} disabled={isPending}>
            تایید
          </Button>
          <DialogClose asChild>
            <Button variant="outline" disabled={isPending}>
              بازگشت
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentTable({ rows }: Props) {
  const data = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        amountLabel: AMOUNT_FORMATTER.format(row.amount),
        dateLabel: DATE_FORMATTER.format(new Date(row.createdAt)),
      })),
    [rows],
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>کاربر</TableHead>
            <TableHead>ارائه‌دهنده</TableHead>
            <TableHead>مرجع</TableHead>
            <TableHead>مبلغ</TableHead>
            <TableHead>وضعیت</TableHead>
            <TableHead>تاریخ ایجاد</TableHead>
            <TableHead className="w-40">عملیات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                پرداختی ثبت نشده است.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-medium">{row.userEmail}</span>
                    <span className="text-xs text-muted-foreground">{row.userName ?? "بدون نام"}</span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm uppercase">{row.provider}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  <span>{row.providerRef}</span>
                  {row.invoiceId ? (
                    <Link href={`/invoice/${row.invoiceId}/pdf`} target="_blank" className="block text-primary hover:underline">
                      فاکتور {row.invoiceNumber ?? ""}
                    </Link>
                  ) : null}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {row.amountLabel} <span className="text-xs text-muted-foreground">{row.currency}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{row.dateLabel}</TableCell>
                <TableCell>
                  <RefundDialog
                    paymentId={row.id}
                    providerRef={row.providerRef}
                    amount={row.amount}
                    disabled={row.status === "REFUNDED"}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

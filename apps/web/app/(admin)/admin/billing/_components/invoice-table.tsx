"use client";

import { useMemo } from "react";
import Link from "next/link";

import type { InvoiceStatus, InvoiceType } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AMOUNT_FORMATTER = new Intl.NumberFormat("fa-IR");
const DATE_FORMATTER = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" });

export type InvoiceRow = {
  id: string;
  number: string;
  userEmail: string;
  userName: string | null;
  type: InvoiceType;
  total: number;
  currency: string;
  issuedAt: string;
  status: InvoiceStatus;
  providerRef: string | null;
};

type Props = {
  rows: InvoiceRow[];
};

function statusVariant(status: InvoiceStatus): "secondary" | "success" | "destructive" {
  switch (status) {
    case "PAID":
      return "success";
    case "VOID":
      return "destructive";
    default:
      return "secondary";
  }
}

function typeVariant(type: InvoiceType): "secondary" | "success" | "warning" {
  switch (type) {
    case "REFUND":
      return "warning";
    default:
      return "secondary";
  }
}

export function InvoiceTable({ rows }: Props) {
  const data = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        amountLabel: AMOUNT_FORMATTER.format(row.total),
        issuedLabel: DATE_FORMATTER.format(new Date(row.issuedAt)),
      })),
    [rows],
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>شماره</TableHead>
            <TableHead>کاربر</TableHead>
            <TableHead>نوع</TableHead>
            <TableHead>مبلغ</TableHead>
            <TableHead>تاریخ صدور</TableHead>
            <TableHead>وضعیت</TableHead>
            <TableHead>دانلود</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                فاکتوری موجود نیست.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-sm font-medium">{row.number}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-medium">{row.userEmail}</span>
                    <span className="text-xs text-muted-foreground">{row.userName ?? "بدون نام"}</span>
                    {row.providerRef ? (
                      <span className="text-xs text-muted-foreground">{row.providerRef}</span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={typeVariant(row.type)}>{row.type}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {row.amountLabel} <span className="text-xs text-muted-foreground">{row.currency}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{row.issuedLabel}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/invoice/${row.id}/pdf`} target="_blank">
                      دانلود
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

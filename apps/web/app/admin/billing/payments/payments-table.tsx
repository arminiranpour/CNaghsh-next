"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatJalaliDateTime } from "@/lib/datetime/jalali";
import { formatRials } from "@/lib/money";

import { ActionDialog } from "../components/action-dialog";
import { markPaymentFailedAction, refundPaymentAction } from "./actions";

const statusLabels: Record<string, string> = {
  PAID: "پرداخت‌شده",
  PENDING: "در انتظار",
  FAILED: "ناموفق",
  REFUNDED: "بازپرداخت‌شده",
  REFUNDED_PARTIAL: "بازپرداخت جزئی",
};

const statusVariants: Record<string, "success" | "secondary" | "outline" | "destructive"> = {
  PAID: "success",
  PENDING: "outline",
  FAILED: "destructive",
  REFUNDED: "secondary",
  REFUNDED_PARTIAL: "secondary",
};

type PaymentRow = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  currency: string;
  status: string;
  refundedAmount: number;
  remainingRefundable: number;
  provider: string;
  providerRef: string;
  createdAt: string;
  updatedAt: string;
  invoice: { id: string; number: string | null; status: string; total: number } | null;
};

type Props = {
  rows: PaymentRow[];
};

export function PaymentsTable({ rows }: Props) {
  const data = useMemo(() => rows, [rows]);
  const [policySelection, setPolicySelection] = useState<Record<string, "revoke_now" | "keep_until_end">>({});

  const getPolicy = (id: string) => policySelection[id] ?? "revoke_now";

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>کاربر</TableHead>
            <TableHead>مبلغ</TableHead>
            <TableHead>وضعیت</TableHead>
            <TableHead>درگاه</TableHead>
            <TableHead>شناسه درگاه</TableHead>
            <TableHead>تاریخ ثبت</TableHead>
            <TableHead className="w-[300px]">اقدامات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const statusVariant = statusVariants[row.status] ?? "outline";
            const createdLabel = formatJalaliDateTime(row.createdAt);
            const invoiceNumber = row.invoice?.number ?? "—";

            return (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">{row.userName}</div>
                    <div className="font-mono text-xs text-muted-foreground">{row.userEmail}</div>
                    <div className="text-xs text-muted-foreground">فاکتور: {invoiceNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      بازپرداخت شده: {formatRials(row.refundedAmount)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div>{formatRials(row.amount)}</div>
                    <div className="text-xs text-muted-foreground">
                      باقیمانده قابل بازپرداخت: {formatRials(row.remainingRefundable)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant}>{statusLabels[row.status] ?? row.status}</Badge>
                </TableCell>
                <TableCell>{row.provider}</TableCell>
                <TableCell>
                  <div className="font-mono text-xs text-muted-foreground break-all">{row.providerRef}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{createdLabel}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2" dir="rtl">
                    {(row.status === "PAID" || row.status === "REFUNDED_PARTIAL") && row.remainingRefundable > 0 ? (
                      <ActionDialog
                        title="ثبت بازپرداخت"
                        description="بازپرداخت به صورت ثبت دفتر انجام می‌شود و می‌توانید سیاست دسترسی را تعیین کنید."
                        triggerLabel="بازپرداخت"
                        confirmLabel="تایید بازپرداخت"
                        variant="destructive"
                        input={{ amount: row.remainingRefundable }}
                        onSubmit={async (payload) =>
                          refundPaymentAction({
                            id: row.id,
                            reason: payload.reason,
                            updatedAt: row.updatedAt,
                            amount: Number(payload.amount ?? row.remainingRefundable),
                            policy: getPolicy(row.id),
                            idempotencyKey:
                              typeof crypto !== "undefined" && crypto.randomUUID
                                ? crypto.randomUUID()
                                : undefined,
                          })
                        }
                      >
                        {({ values, onChange }) => {
                          const rawAmount = values.amount;
                          const amountValue =
                            typeof rawAmount === "number"
                              ? rawAmount
                              : typeof rawAmount === "string"
                                ? Number.parseInt(rawAmount, 10) || row.remainingRefundable
                                : row.remainingRefundable;

                          return (
                          <div className="space-y-3 text-sm">
                            <div className="space-y-2">
                              <Label htmlFor={`amount-${row.id}`}>مبلغ بازپرداخت (ریال)</Label>
                              <Input
                                id={`amount-${row.id}`}
                                type="number"
                                dir="ltr"
                                min={1}
                                max={row.remainingRefundable}
                                value={String(amountValue)}
                                onChange={(event) => onChange({ amount: event.target.value })}
                                onBlur={(event) => {
                                  const numeric = Number.parseInt(event.target.value, 10);
                                  if (!Number.isFinite(numeric) || numeric <= 0) {
                                    onChange({ amount: row.remainingRefundable });
                                    return;
                                  }

                                  if (numeric > row.remainingRefundable) {
                                    onChange({ amount: row.remainingRefundable });
                                  }
                                }}
                                required
                              />
                              <p className="text-xs text-muted-foreground">
                                حداکثر مبلغ قابل بازپرداخت {formatRials(row.remainingRefundable)} است.
                              </p>
                            </div>
                            <div className="space-y-2">
                              <div className="font-medium">سیاست دسترسی پس از بازپرداخت</div>
                              <div className="space-y-2" dir="rtl">
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="radio"
                                    name={`policy-${row.id}`}
                                    value="revoke_now"
                                    checked={getPolicy(row.id) === "revoke_now"}
                                    onChange={() => setPolicySelection((prev) => ({ ...prev, [row.id]: "revoke_now" }))}
                                  />
                                  لغو فوری دسترسی انتشار پروفایل
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="radio"
                                    name={`policy-${row.id}`}
                                    value="keep_until_end"
                                    checked={getPolicy(row.id) === "keep_until_end"}
                                    onChange={() => setPolicySelection((prev) => ({ ...prev, [row.id]: "keep_until_end" }))}
                                  />
                                  حفظ دسترسی تا پایان دوره فعلی
                                </label>
                              </div>
                            </div>
                          </div>
                          );
                        }}
                      </ActionDialog>
                    ) : null}
                    {row.status === "PENDING" ? (
                      <ActionDialog
                        title="علامت‌گذاری به‌عنوان ناموفق"
                        description="وضعیت پرداخت به ناموفق تغییر می‌کند و فاکتور مرتبط در صورت وجود باطل می‌شود."
                        triggerLabel="ناموفق"
                        confirmLabel="تایید"
                        variant="outline"
                        input={{}}
                        onSubmit={(payload) =>
                          markPaymentFailedAction({
                            id: row.id,
                            reason: payload.reason,
                            updatedAt: row.updatedAt,
                            idempotencyKey:
                              typeof crypto !== "undefined" && crypto.randomUUID
                                ? crypto.randomUUID()
                                : undefined,
                          })
                        }
                      />
                    ) : null}
                    <Button variant="secondary" size="sm" asChild>
                      <Link
                        href={`/admin/billing/webhooks?providerRef=${encodeURIComponent(row.providerRef)}`}
                        target="_blank"
                      >
                        مشاهده لاگ‌ها
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const statusVariants: Record<string, "success" | "secondary" | "outline" | "destructive"> = {
  PAID: "success",
  PENDING: "outline",
  FAILED: "destructive",
  REFUNDED: "secondary",
};

type PaymentRow = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerRef: string;
  createdAt: string;
  updatedAt: string;
  invoice: { id: string; number: string; status: string; total: number } | null;
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
                  </div>
                </TableCell>
                <TableCell>{formatRials(row.amount)}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant}>{row.status}</Badge>
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
                    {row.status === "PAID" ? (
                      <ActionDialog
                        title="ثبت بازپرداخت"
                        description="بازپرداخت به صورت ثبت دفتر انجام می‌شود و می‌توانید سیاست دسترسی را تعیین کنید."
                        triggerLabel="بازپرداخت"
                        confirmLabel="تایید بازپرداخت"
                        variant="destructive"
                        input={{}}
                        onSubmit={async (payload) =>
                          refundPaymentAction({
                            id: row.id,
                            reason: payload.reason,
                            updatedAt: row.updatedAt,
                            policy: getPolicy(row.id),
                            idempotencyKey:
                              typeof crypto !== "undefined" && crypto.randomUUID
                                ? crypto.randomUUID()
                                : undefined,
                          })
                        }
                      >
                        {() => (
                          <div className="space-y-3 text-sm">
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
                        )}
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

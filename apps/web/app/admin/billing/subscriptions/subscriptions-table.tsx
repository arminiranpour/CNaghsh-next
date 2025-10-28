"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { formatRials } from "@/lib/money";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/datetime/jalali";

import { ActionDialog } from "../components/action-dialog";
import {
  cancelAtPeriodEndAction,
  cancelNowAction,
  adjustEndsAtAction,
  recomputeEntitlementsAction,
} from "./actions";

const statusLabels: Record<string, string> = {
  active: "فعال",
  renewing: "در حال تمدید",
  canceled: "لغو شده",
  expired: "منقضی شده",
};

const cancelLabels: Record<string, string> = {
  true: "فعال",
  false: "غیرفعال",
};

type LatestPayment = {
  id: string;
  provider: string;
  providerRef: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
};

type SubscriptionRow = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  planName: string;
  planId: string;
  status: string;
  startedAt: string;
  endsAt: string;
  renewalAt: string | null;
  cancelAtPeriodEnd: boolean;
  providerRef: string | null;
  updatedAt: string;
  latestPayment: LatestPayment | null;
};

type Props = {
  rows: SubscriptionRow[];
};

export function SubscriptionsTable({ rows }: Props) {
  const data = useMemo(() => rows, [rows]);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">کاربر</TableHead>
            <TableHead>پلن</TableHead>
            <TableHead>وضعیت</TableHead>
            <TableHead>تاریخ شروع</TableHead>
            <TableHead>پایان</TableHead>
            <TableHead>تمدید</TableHead>
            <TableHead>لغو در پایان دوره</TableHead>
            <TableHead>آخرین پرداخت</TableHead>
            <TableHead className="w-[260px]">اقدامات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const lastPaymentLabel = row.latestPayment
              ? `${formatRials(row.latestPayment.amount)} • ${row.latestPayment.provider}`
              : "—";
            const lastPaymentTime = row.latestPayment
              ? formatJalaliDateTime(row.latestPayment.createdAt)
              : "—";

            return (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">{row.userName || row.userEmail}</div>
                    <div className="font-mono text-xs text-muted-foreground">{row.userEmail}</div>
                  </div>
                </TableCell>
                <TableCell>{row.planName}</TableCell>
                <TableCell>
                  <Badge variant={row.status === "active" || row.status === "renewing" ? "success" : "secondary"}>
                    {statusLabels[row.status] ?? row.status}
                  </Badge>
                </TableCell>
                <TableCell>{formatJalaliDate(row.startedAt)}</TableCell>
                <TableCell>{formatJalaliDate(row.endsAt)}</TableCell>
                <TableCell>{row.renewalAt ? formatJalaliDate(row.renewalAt) : "—"}</TableCell>
                <TableCell>
                  <Badge variant={row.cancelAtPeriodEnd ? "secondary" : "outline"}>
                    {cancelLabels[String(row.cancelAtPeriodEnd)]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div>{lastPaymentLabel}</div>
                    <div className="text-xs text-muted-foreground">{lastPaymentTime}</div>
                    {row.latestPayment?.providerRef ? (
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {row.latestPayment.providerRef}
                      </div>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2" dir="rtl">
                    <ActionDialog
                      title="لغو فوری اشتراک"
                      description="اشتراک بلافاصله لغو می‌شود و دسترسی کاربر جمع‌آوری خواهد شد."
                      triggerLabel="لغو فوری"
                      confirmLabel="تایید لغو"
                      variant="destructive"
                      input={{}}
                      onSubmit={async (payload) =>
                        cancelNowAction({
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
                    <ActionDialog
                      title={row.cancelAtPeriodEnd ? "حذف لغو در پایان دوره" : "لغو در پایان دوره"}
                      description={
                        row.cancelAtPeriodEnd
                          ? "پرچم لغو در پایان دوره حذف خواهد شد."
                          : "اشتراک پس از پایان دوره جاری تمدید نمی‌شود."
                      }
                      triggerLabel={row.cancelAtPeriodEnd ? "حذف پرچم" : "لغو در پایان"}
                      confirmLabel="ثبت"
                      input={{}}
                      onSubmit={(payload) =>
                        cancelAtPeriodEndAction({
                          id: row.id,
                          reason: payload.reason,
                          updatedAt: row.updatedAt,
                          cancel: !row.cancelAtPeriodEnd,
                        })
                      }
                    />
                    <ActionDialog
                      title="تنظیم تاریخ پایان"
                      description="تاریخ جدید پایان اشتراک را مشخص کنید."
                      triggerLabel="تغییر پایان"
                      confirmLabel="ذخیره تغییر"
                      input={{ newEndsAt: row.endsAt }}
                      onSubmit={(payload) =>
                        adjustEndsAtAction({
                          id: row.id,
                          reason: payload.reason,
                          updatedAt: row.updatedAt,
                          newEndsAt: String(payload.newEndsAt ?? row.endsAt),
                        })
                      }
                    >
                      {({ values, onChange }) => (
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor={`ends-${row.id}`}>
                            تاریخ پایان جدید (ISO)
                          </label>
                          <Input
                            id={`ends-${row.id}`}
                            dir="ltr"
                            value={(values.newEndsAt as string) ?? ""}
                            onChange={(event) =>
                              onChange({ newEndsAt: event.target.value ? event.target.value : undefined })
                            }
                            placeholder="2025-12-31T20:30:00.000Z"
                            required
                          />
                        </div>
                      )}
                    </ActionDialog>
                    <ActionDialog
                      title="بازسازی دسترسی‌ها"
                      description="هماهنگی دسترسی‌های کاربر با وضعیت اشتراک انجام می‌شود."
                      triggerLabel="بازسازی"
                      confirmLabel="اجرای بازسازی"
                      input={{}}
                      onSubmit={(payload) =>
                        recomputeEntitlementsAction({
                          userId: row.userId,
                          subscriptionId: row.id,
                          reason: payload.reason,
                        })
                      }
                    />
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

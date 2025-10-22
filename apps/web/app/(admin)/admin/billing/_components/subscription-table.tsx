"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { SubscriptionStatus } from "@prisma/client";

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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const DATE_FORMATTER = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export type SubscriptionRow = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  planName: string;
  status: SubscriptionStatus;
  endsAt: string;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
  providerRef: string | null;
  hasEntitlement: boolean;
  entitlementExpiresAt: string | null;
};

type Props = {
  rows: SubscriptionRow[];
};

function statusVariant(status: SubscriptionStatus): "default" | "secondary" | "destructive" | "success" {
  switch (status) {
    case "active":
    case "renewing":
      return "success";
    case "expired":
    case "canceled":
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

function ForceCancelDialog({ subscriptionId, userEmail }: { subscriptionId: string; userEmail: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(() => {
      postJson(`/api/admin/subscriptions/${subscriptionId}/cancel`)
        .then(() => {
          toast({ title: "اشتراک لغو شد." });
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
        <Button size="sm" variant="destructive" disabled={isPending}>
          لغو فوری
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>لغو فوری اشتراک</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          اشتراک کاربر {userEmail} بلافاصله منقضی می‌شود و دسترسی‌ها حذف خواهند شد. آیا مطمئن هستید؟
        </p>
        <DialogFooter className="mt-6 flex flex-row-reverse gap-2">
          <Button onClick={handleConfirm} disabled={isPending} variant="destructive">
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

function EntitlementDialog({
  userId,
  userEmail,
  hasEntitlement,
  entitlementExpiresAt,
}: {
  userId: string;
  userEmail: string;
  hasEntitlement: boolean;
  entitlementExpiresAt: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState(entitlementExpiresAt ? entitlementExpiresAt.slice(0, 10) : "");

  const handleSubmit = () => {
    if (reason.trim().length === 0) {
      toast({ variant: "destructive", title: "خطا", description: "لطفاً دلیل را وارد کنید." });
      return;
    }

    const payload: Record<string, unknown> = {
      userId,
      action: hasEntitlement ? "revoke" : "grant",
      key: "CAN_PUBLISH_PROFILE",
      reason: reason.trim(),
    };

    if (!hasEntitlement && expiresAt) {
      payload.expiresAt = new Date(expiresAt).toISOString();
    }

    startTransition(() => {
      postJson("/api/admin/entitlements/adjust", payload)
        .then(() => {
          toast({ title: "تغییرات ثبت شد." });
          setOpen(false);
          setReason("");
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
        <Button size="sm" variant="outline" disabled={isPending}>
          {hasEntitlement ? "لغو دسترسی" : "اعطای دسترسی"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{hasEntitlement ? "لغو دسترسی انتشار" : "اعطای دسترسی انتشار"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            کاربر {userEmail} {hasEntitlement ? "دسترسی فعال دارد." : "در حال حاضر دسترسی ندارد."}
          </p>
          {!hasEntitlement ? (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor={`expires-${userId}`}>
                تاریخ انقضا (اختیاری)
              </label>
              <Input
                id={`expires-${userId}`}
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor={`reason-${userId}`}>
              دلیل اقدام
            </label>
            <Textarea
              id={`reason-${userId}`}
              value={reason}
              rows={3}
              onChange={(event) => setReason(event.target.value)}
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

export function SubscriptionTable({ rows }: Props) {
  const data = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        endsAtLabel: DATE_FORMATTER.format(new Date(row.endsAt)),
        updatedAtLabel: DATE_FORMATTER.format(new Date(row.updatedAt)),
        entitlementLabel: row.entitlementExpiresAt
          ? DATE_FORMATTER.format(new Date(row.entitlementExpiresAt))
          : null,
      })),
    [rows],
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>کاربر</TableHead>
            <TableHead>پلن</TableHead>
            <TableHead>وضعیت</TableHead>
            <TableHead>پایان دوره</TableHead>
            <TableHead>تمدید</TableHead>
            <TableHead>به‌روز رسانی</TableHead>
            <TableHead>دسترسی</TableHead>
            <TableHead className="w-48">عملیات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                موردی برای نمایش وجود ندارد.
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
                <TableCell className="whitespace-nowrap">{row.planName}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{row.endsAtLabel}</TableCell>
                <TableCell>
                  {row.cancelAtPeriodEnd ? (
                    <Badge variant="warning">لغو در پایان دوره</Badge>
                  ) : (
                    <Badge variant="secondary">فعال</Badge>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{row.updatedAtLabel}</TableCell>
                <TableCell>
                  {row.hasEntitlement ? (
                    <div className="flex flex-col gap-1">
                      <Badge variant="success">فعال</Badge>
                      {row.entitlementLabel ? (
                        <span className="text-xs text-muted-foreground">تا {row.entitlementLabel}</span>
                      ) : null}
                    </div>
                  ) : (
                    <Badge variant="outline">غیرفعال</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <ForceCancelDialog subscriptionId={row.id} userEmail={row.userEmail} />
                    <EntitlementDialog
                      userId={row.userId}
                      userEmail={row.userEmail}
                      hasEntitlement={row.hasEntitlement}
                      entitlementExpiresAt={row.entitlementExpiresAt}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

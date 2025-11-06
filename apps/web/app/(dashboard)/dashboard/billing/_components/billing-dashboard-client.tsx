"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import type {
  BillingDashboardActions,
  BillingDashboardData,
} from "@/lib/billing/dashboard.types";
import { emitBillingTelemetry } from "@/lib/billing/telemetry";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/datetime/jalali";
import { formatRials } from "@/lib/money";

const statusLabels: Record<string, string> = {
  active: "فعال",
  renewing: "در حال تمدید",
  canceled: "لغوشده",
  expired: "منقضی‌شده",
};

const subscriptionBadgeVariants: Record<string, "success" | "warning" | "secondary" | "destructive"> = {
  active: "success",
  renewing: "warning",
  canceled: "secondary",
  expired: "destructive",
};

const cycleLabels: Record<string, string> = {
  MONTHLY: "ماهانه",
  QUARTERLY: "سه‌ماهه",
  YEARLY: "سالانه",
};

const paymentStatusLabels: Record<string, string> = {
  PAID: "پرداخت‌شده",
  PENDING: "در انتظار",
  FAILED: "ناموفق",
  REFUNDED: "بازپرداخت‌شده",
};

const paymentStatusVariants: Record<string, "success" | "secondary" | "outline" | "destructive"> = {
  PAID: "success",
  PENDING: "outline",
  FAILED: "destructive",
  REFUNDED: "secondary",
};

const invoiceStatusLabels: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  PAID: "پرداخت‌شده",
  VOID: "باطل‌شده",
  REFUNDED: "بازپرداخت‌شده",
};

const invoiceStatusVariants: Record<string, "secondary" | "success" | "outline"> = {
  DRAFT: "outline",
  PAID: "success",
  VOID: "secondary",
  REFUNDED: "outline",
};

const providerLabels: Record<string, string> = {
  zarinpal: "زرین‌پال",
  idpay: "آیدی‌پی",
  nextpay: "نکست‌پی",
};

const numberFormatter = new Intl.NumberFormat("fa-IR");

const toDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatCountdown = (nowIso: string, targetIso: string): string | null => {
  const now = toDate(nowIso);
  const target = toDate(targetIso);

  if (!now || !target) {
    return null;
  }

  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) {
    return null;
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  if (days > 0 && hours > 0) {
    return `${numberFormatter.format(days)} روز و ${numberFormatter.format(hours)} ساعت باقی‌مانده`;
  }

  if (days > 0) {
    return `${numberFormatter.format(days)} روز باقی‌مانده`;
  }

  if (hours > 0) {
    return `${numberFormatter.format(hours)} ساعت باقی‌مانده`;
  }

  if (minutes > 0) {
    return `${numberFormatter.format(minutes)} دقیقه باقی‌مانده`;
  }

  return null;
};

const matchesDateRange = (iso: string, from: string, to: string): boolean => {
  const date = toDate(iso);
  if (!date) {
    return false;
  }

  if (from) {
    const fromDate = new Date(`${from}T00:00:00Z`);
    if (date.getTime() < fromDate.getTime()) {
      return false;
    }
  }

  if (to) {
    const toDateValue = new Date(`${to}T23:59:59Z`);
    if (date.getTime() > toDateValue.getTime()) {
      return false;
    }
  }

  return true;
};

type BillingDashboardClientProps = {
  initialData: BillingDashboardData;
  actions: BillingDashboardActions;
};

type DateFilters = { from: string; to: string };

type HistoryTab = "payments" | "invoices";

type NotificationState = {
  message: string;
  description?: string;
  variant?: "warning" | "info" | "error";
  action?: { label: string; onClick: () => void };
};

export function BillingDashboardClient({
  initialData,
  actions,
}: BillingDashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState(initialData);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isCancelPending, startCancelTransition] = useTransition();
  const [isRenewPending, startRenewTransition] = useTransition();
  const [historyTab, setHistoryTab] = useState<HistoryTab>("payments");
  const [dateFilters, setDateFilters] = useState<DateFilters>({ from: "", to: "" });
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const telemetryInitialized = useRef(false);

  const subscription = data.subscription;
  const countdown = subscription
    ? formatCountdown(data.now, subscription.endsAt)
    : null;
  const endsAtDate = subscription ? toDate(subscription.endsAt) : null;
  const renewalAtDate = subscription ? toDate(subscription.renewalAt) : null;
  const isExpiringSoon =
    endsAtDate && endsAtDate.getTime() > Date.now()
      ? (endsAtDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 3
      : false;
  const remainingDays = endsAtDate
    ? (endsAtDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    : null;
  const showCountdown = Boolean(
    subscription &&
      countdown &&
      (subscription.status === "active" || subscription.status === "renewing") &&
      (!subscription.cancelAtPeriodEnd || (remainingDays ?? 0) <= 30),
  );

  const failedPayment = data.latestFailedPayment;
  const recentFailedPayment = useMemo(() => {
    if (!failedPayment) {
      return null;
    }
    const created = toDate(failedPayment.createdAt);
    if (!created) {
      return null;
    }
    const diffDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7 ? failedPayment : null;
  }, [failedPayment]);

  useEffect(() => {
    if (!telemetryInitialized.current) {
      telemetryInitialized.current = true;
      return;
    }

    emitBillingTelemetry("billing_history_filtered", {
      tab: historyTab,
      status:
        historyTab === "payments" ? paymentStatusFilter : invoiceStatusFilter,
      from: dateFilters.from || null,
      to: dateFilters.to || null,
    });
  }, [dateFilters.from, dateFilters.to, historyTab, invoiceStatusFilter, paymentStatusFilter]);

  const filteredPayments = useMemo(() => {
    return data.payments.filter((payment) => {
      if (paymentStatusFilter !== "all" && payment.status !== paymentStatusFilter) {
        return false;
      }

      if (dateFilters.from || dateFilters.to) {
        return matchesDateRange(payment.createdAt, dateFilters.from, dateFilters.to);
      }

      return true;
    });
  }, [data.payments, dateFilters.from, dateFilters.to, paymentStatusFilter]);

  const filteredInvoices = useMemo(() => {
    return data.invoices.filter((invoice) => {
      if (invoiceStatusFilter !== "all" && invoice.status !== invoiceStatusFilter) {
        return false;
      }

      if (dateFilters.from || dateFilters.to) {
        return matchesDateRange(invoice.issuedAt, dateFilters.from, dateFilters.to);
      }

      return true;
    });
  }, [data.invoices, dateFilters.from, dateFilters.to, invoiceStatusFilter]);

  const handleCancel = (flag: boolean) => {
    if (!subscription) {
      return;
    }

    startCancelTransition(async () => {
      const result = await actions.setCancelAtPeriodEnd(flag);
      if (!result.ok) {
        toast({
          title: "عدم موفقیت",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setData(result.data);
      toast({
        title: "وضعیت شما به‌روزرسانی شد.",
        description: flag
          ? "لغو اشتراک در پایان دوره ثبت شد."
          : "درخواست لغو حذف شد و اشتراک فعال باقی ماند.",
      });
      setDialogOpen(false);
    });
  };

  const handleRenew = () => {
    if (!subscription) {
      return;
    }

    startRenewTransition(async () => {
      const result = await actions.renewSubscription();
      if (!result.ok) {
        toast({
          title: "خطا در شروع تمدید",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "در حال انتقال",
        description: "به درگاه پرداخت هدایت می‌شوید...",
      });
      router.push(`/checkout/${result.data.sessionId}` as Route);
      window.location.href = result.data.redirectUrl;
    });
  };

  const paymentRows = filteredPayments.map((payment) => {
    return {
      ...payment,
      createdLabel: formatJalaliDateTime(payment.createdAt),
      statusLabel: paymentStatusLabels[payment.status] ?? payment.status,
      providerLabel: providerLabels[payment.provider] ?? payment.provider,
    };
  });

  const invoiceRows = filteredInvoices.map((invoice) => {
    return {
      ...invoice,
      issuedLabel: formatJalaliDateTime(invoice.issuedAt),
      statusLabel: invoiceStatusLabels[invoice.status] ?? invoice.status,
      providerLabel: invoice.provider
        ? providerLabels[invoice.provider] ?? invoice.provider
        : "—",
    };
  });

  const notifications: NotificationState[] = [];

  if (subscription?.cancelAtPeriodEnd) {
    notifications.push({
      message: "لغو شما در پایان دوره اعمال می‌شود.",
      description: subscription.endsAt
        ? `دسترسی شما تا ${formatJalaliDate(subscription.endsAt)} فعال است.`
        : undefined,
      variant: "info",
      action: {
        label: "لغو درخواست لغو",
        onClick: () => handleCancel(false),
      },
    });
  }

  if (isExpiringSoon && subscription && subscription.status !== "expired") {
    notifications.push({
      message: "اشتراک شما به‌زودی منقضی می‌شود.",
      description: "برای جلوگیری از توقف دسترسی، تمدید را انجام دهید.",
      variant: "warning",
      action: {
        label: "تمدید سریع",
        onClick: handleRenew,
      },
    });
  }

  if (recentFailedPayment) {
    notifications.push({
      message: "پرداخت اخیر شما ناموفق بود.",
      description: "می‌توانید دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.",
      variant: "error",
      action: subscription
        ? {
            label: "تلاش دوباره پرداخت",
            onClick: handleRenew,
          }
        : {
            label: "تماس با پشتیبانی",
            onClick: () => {
              window.open("mailto:support@example.com", "_blank");
            },
          },
    });
  }

  const renderNotifications = () => {
    if (notifications.length === 0) {
      return null;
    }

    return (
      <div className="space-y-3">
        {notifications.map((item, index) => (
          <div
            key={`${item.message}-${index}`}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
              item.variant === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : item.variant === "error"
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-primary/20 bg-primary/5 text-primary"
            }`}
            role="status"
          >
            <div className="space-y-1">
              <p className="font-semibold">{item.message}</p>
              {item.description ? (
                <p className="text-xs text-muted-foreground">{item.description}</p>
              ) : null}
            </div>
            {item.action ? (
              <Button
                variant={item.variant === "error" ? "destructive" : "outline"}
                size="sm"
                onClick={item.action.onClick}
                disabled={isCancelPending || isRenewPending}
              >
                {item.action.label}
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  const handleCancelClick = () => {
    emitBillingTelemetry("billing_sub_cancel_period_end_clicked", {
      userId: data.userId,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      status: subscription?.status ?? null,
    });
    setDialogOpen(true);
  };

  const subscriptionContent = subscription ? (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            {subscription.plan.name}
            <Badge variant={subscriptionBadgeVariants[subscription.status] ?? "secondary"}>
              {statusLabels[subscription.status] ?? subscription.status}
            </Badge>
          </CardTitle>
          <CardDescription>
            پلن {cycleLabels[subscription.plan.cycle] ?? subscription.plan.cycle}
          </CardDescription>
        </div>
        <div className="text-sm text-muted-foreground">
          {subscription.providerRef ? (
            <span className="font-mono">شناسه ارائه‌دهنده: {subscription.providerRef}</span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-sm text-muted-foreground">پایان دوره</div>
            <div className="text-lg font-semibold">
              {formatJalaliDate(subscription.endsAt)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">شروع</div>
            <div className="text-lg font-semibold">
              {formatJalaliDate(subscription.startedAt)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">تمدید برنامه‌ریزی‌شده</div>
            <div className="text-lg font-semibold">
              {renewalAtDate ? formatJalaliDate(subscription.renewalAt) : "—"}
            </div>
          </div>
        </div>
        {showCountdown ? (
          <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            {countdown}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleCancelClick}
            disabled={
              isCancelPending ||
              subscription.cancelAtPeriodEnd ||
              subscription.status === "canceled" ||
              subscription.status === "expired"
            }
          >
            لغو اشتراک در پایان دوره
          </Button>
          <Button
            onClick={handleRenew}
            disabled={isRenewPending}
            variant={subscription.status === "expired" ? "default" : "outline"}
          >
            تمدید اشتراک اکنون
          </Button>
          <Button asChild variant="link">
            <Link href={`/pricing?plan=${subscription.plan.id}` as Route}>تغییر پلن</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">هیچ اشتراکی فعال نیست</CardTitle>
        <CardDescription>
          برای فعال شدن دسترسی انتشار پروفایل، یکی از پلن‌های اشتراک را انتخاب کنید.
        </CardDescription>
      </CardHeader>
      <CardContent>
          <Button asChild>
            <Link href={"/pricing" as Route}>
              مشاهده پلن‌ها
            </Link>
          </Button>
      </CardContent>
    </Card>
  );

  const entitlementCard = (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">دسترسی انتشار پروفایل</CardTitle>
        <CardDescription>
          این دسترسی از اشتراک فعال شما صادر می‌شود و اجازه می‌دهد پروفایل خود را عمومی کنید.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">وضعیت</div>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={data.entitlements.canPublishProfile.active ? "success" : "secondary"}>
                {data.entitlements.canPublishProfile.active ? "فعال" : "غیرفعال"}
              </Badge>
              {data.entitlements.canPublishProfile.active ? (
                <span className="text-sm text-muted-foreground">
                  تا {formatJalaliDate(data.entitlements.canPublishProfile.expiresAt)}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  لطفاً اشتراک خود را تمدید کنید تا انتشار فعال شود.
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          در صورت لغو یا پایان اشتراک، این دسترسی نیز در پایان دوره منقضی خواهد شد.
        </div>
      </CardContent>
    </Card>
  );

  const historyControls = (
    <div className="flex flex-wrap gap-4">
      <div className="w-full max-w-[180px]">
        <label className="block text-xs font-medium text-muted-foreground" htmlFor="from-date">
          از تاریخ
        </label>
        <Input
          id="from-date"
          type="date"
          value={dateFilters.from}
          onChange={(event) =>
            setDateFilters((prev) => ({ ...prev, from: event.target.value }))
          }
        />
      </div>
      <div className="w-full max-w-[180px]">
        <label className="block text-xs font-medium text-muted-foreground" htmlFor="to-date">
          تا تاریخ
        </label>
        <Input
          id="to-date"
          type="date"
          value={dateFilters.to}
          onChange={(event) =>
            setDateFilters((prev) => ({ ...prev, to: event.target.value }))
          }
        />
      </div>
      <div className="w-full max-w-[220px]">
        <label className="block text-xs font-medium text-muted-foreground">
          وضعیت
        </label>
        {historyTab === "payments" ? (
          <Select
            value={paymentStatusFilter}
            onValueChange={(value) => setPaymentStatusFilter(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="همه وضعیت‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {Object.entries(paymentStatusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select
            value={invoiceStatusFilter}
            onValueChange={(value) => setInvoiceStatusFilter(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="همه وضعیت‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              {Object.entries(invoiceStatusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );

  const historyTable = historyTab === "payments" ? (
    filteredPayments.length === 0 ? (
      <p className="py-6 text-sm text-muted-foreground">تراکنشی یافت نشد.</p>
    ) : (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>تاریخ</TableHead>
              <TableHead>مبلغ</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead>درگاه</TableHead>
              <TableHead>شناسه پرداخت</TableHead>
              <TableHead>شماره فاکتور</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.createdLabel}</TableCell>
                <TableCell>{formatRials(row.amount)}</TableCell>
                <TableCell>
                  <Badge variant={paymentStatusVariants[row.status] ?? "outline"}>
                    {row.statusLabel}
                  </Badge>
                </TableCell>
                <TableCell>{row.providerLabel}</TableCell>
                <TableCell className="font-mono text-xs">{row.providerRef}</TableCell>
                <TableCell>{row.invoice?.number ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  ) : filteredInvoices.length === 0 ? (
    <p className="py-6 text-sm text-muted-foreground">فاکتوری یافت نشد.</p>
  ) : (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>تاریخ</TableHead>
            <TableHead>مبلغ</TableHead>
            <TableHead>وضعیت</TableHead>
            <TableHead>درگاه</TableHead>
            <TableHead>شناسه مرجع</TableHead>
            <TableHead>دریافت رسید</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoiceRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.issuedLabel}</TableCell>
              <TableCell>{formatRials(row.total)}</TableCell>
              <TableCell>
                <Badge variant={invoiceStatusVariants[row.status] ?? "outline"}>
                  {row.statusLabel}
                </Badge>
              </TableCell>
              <TableCell>{row.providerLabel}</TableCell>
              <TableCell className="font-mono text-xs">
                {row.providerRef ?? "—"}
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!row.pdfUrl}
                  onClick={() => {
                    if (!row.pdfUrl) {
                      return;
                    }
                    emitBillingTelemetry("billing_invoice_pdf_downloaded", {
                      invoiceId: row.id,
                    });
                    window.open(row.pdfUrl, "_blank", "noopener");
                  }}
                  title={row.pdfUrl ? "دانلود رسید" : "رسید برای این فاکتور در دسترس نیست"}
                >
                  دریافت PDF
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {renderNotifications()}

      {subscriptionContent}

      {entitlementCard}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">تاریخچه پرداخت و فاکتورها</CardTitle>
          <CardDescription>
            فهرست تراکنش‌ها و فاکتورهای شما. می‌توانید بر اساس تاریخ و وضعیت فیلتر کنید.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2 rounded-full border border-border bg-muted/40 p-1 text-sm">
              <button
                type="button"
                className={`rounded-full px-3 py-1 transition ${
                  historyTab === "payments"
                    ? "bg-background shadow"
                    : "text-muted-foreground"
                }`}
                onClick={() => setHistoryTab("payments")}
              >
                پرداخت‌ها
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1 transition ${
                  historyTab === "invoices"
                    ? "bg-background shadow"
                    : "text-muted-foreground"
                }`}
                onClick={() => setHistoryTab("invoices")}
              >
                فاکتورها
              </button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFilters({ from: "", to: "" });
                setPaymentStatusFilter("all");
                setInvoiceStatusFilter("all");
              }}
            >
              حذف فیلترها
            </Button>
          </div>

          {historyControls}

          {historyTable}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">راهنمای اقدامات صورتحساب</CardTitle>
          <CardDescription>
            توضیح کوتاهی درباره هر اقدام برای اطمینان از تصمیم‌گیری آگاهانه.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <span className="font-semibold text-foreground">لغو اشتراک در پایان دوره:</span> این گزینه اشتراک شما را تا پایان دوره فعال نگه می‌دارد و پس از آن تمدید نمی‌شود. در هر زمان می‌توانید درخواست را لغو کنید.
          </div>
          <div>
            <span className="font-semibold text-foreground">تمدید اشتراک اکنون:</span> شما را به درگاه پرداخت هدایت می‌کند تا دوره جدیدی از همان پلن خریداری کنید. پس از موفقیت، زمان پایان اشتراک به‌صورت خودکار تمدید می‌شود.
          </div>
          <div>
            <span className="font-semibold text-foreground">تغییر پلن:</span> به صفحه قیمت‌گذاری هدایت می‌شوید تا پلن دیگری را انتخاب کنید. پس از خرید، مزایای پلن جدید بلافاصله فعال می‌شود.
          </div>
          <div>
            <span className="font-semibold text-foreground">دریافت PDF فاکتور:</span> رسید رسمی پرداخت را دانلود کنید. اگر در دسترس نباشد، با پشتیبانی تماس بگیرید.
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>لغو اشتراک در پایان دوره</DialogTitle>
            <DialogDescription>
              این اقدام باعث می‌شود اشتراک شما پس از تاریخ پایان فعلی تمدید نشود. تا آن زمان تمام دسترسی‌ها فعال می‌مانند.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row-reverse gap-2">
            <Button
              onClick={() => handleCancel(true)}
              disabled={isCancelPending}
              variant="destructive"
            >
              تایید لغو در پایان دوره
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              انصراف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

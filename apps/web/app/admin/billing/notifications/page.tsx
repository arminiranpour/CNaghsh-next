import Link from "next/link";
import { NotificationChannel, NotificationDispatchStatus, NotificationType } from "@prisma/client";
import type { Route } from "next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listNotificationLogs } from "@/lib/admin/billing/queries";
import { formatJalaliDateTime, toIsoString } from "@/lib/datetime/jalali";

import { PaginationControls } from "../components/pagination";

const PAGE_PATH = "/admin/billing/notifications" as Route;
const PAGE_SIZE = 25;

const statusOptions: { value: "all" | NotificationDispatchStatus; label: string }[] = [
  { value: "all", label: "همه وضعیت‌ها" },
  { value: NotificationDispatchStatus.QUEUED, label: "در صف" },
  { value: NotificationDispatchStatus.SENT, label: "ارسال شد" },
  { value: NotificationDispatchStatus.FAILED, label: "ناموفق" },
  { value: NotificationDispatchStatus.SKIPPED, label: "رد شد" },
];

const channelOptions: { value: "all" | NotificationChannel; label: string }[] = [
  { value: "all", label: "همه کانال‌ها" },
  { value: NotificationChannel.EMAIL, label: "ایمیل" },
  { value: NotificationChannel.IN_APP, label: "درون‌برنامه" },
];

const sortOptions = [
  { value: "createdAt:desc", label: "جدیدترین" },
  { value: "createdAt:asc", label: "قدیمی‌ترین" },
  { value: "status:asc", label: "وضعیت (صعودی)" },
  { value: "status:desc", label: "وضعیت (نزولی)" },
  { value: "attempts:desc", label: "بیشترین تلاش" },
  { value: "attempts:asc", label: "کمترین تلاش" },
];

function parseSortParam(raw: string | undefined) {
  if (!raw) {
    return { field: "createdAt" as const, direction: "desc" as const };
  }

  const [field, direction] = raw.split(":");
  const validField = ["createdAt", "status", "channel", "attempts"].includes(field);
  const validDirection = direction === "asc" || direction === "desc";

  if (!validField || !validDirection) {
    return { field: "createdAt" as const, direction: "desc" as const };
  }

  return { field: field as "createdAt" | "status" | "channel" | "attempts", direction: direction as "asc" | "desc" };
}

function toSearchParams(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    } else if (typeof value === "string") {
      params.set(key, value);
    }
  }
  return params;
}

function getStatusVariant(status: NotificationDispatchStatus) {
  switch (status) {
    case NotificationDispatchStatus.SENT:
      return "default" as const;
    case NotificationDispatchStatus.FAILED:
      return "destructive" as const;
    case NotificationDispatchStatus.SKIPPED:
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function formatChannel(channel: NotificationChannel) {
  return channel === NotificationChannel.EMAIL ? "ایمیل" : "درون‌برنامه";
}

const jalaliDateTime = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const numberFormatter = new Intl.NumberFormat("fa-IR");

function renderMetadata(metadata: unknown) {
  if (!metadata) {
    return "—";
  }

  try {
    return JSON.stringify(metadata, null, 2);
  } catch (error) {
    return String(metadata);
  }
}

export default async function NotificationLogsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const statusRaw = typeof searchParams.status === "string" ? searchParams.status : undefined;
  const channelRaw = typeof searchParams.channel === "string" ? searchParams.channel : undefined;
  const typeRaw = typeof searchParams.type === "string" ? searchParams.type : undefined;
  const queryRaw = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const fromRaw = typeof searchParams.from === "string" ? searchParams.from : undefined;
  const toRaw = typeof searchParams.to === "string" ? searchParams.to : undefined;
  const sortRaw = typeof searchParams.sort === "string" ? searchParams.sort : undefined;
  const pageParam = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page, 10) : 1;

  const sort = parseSortParam(sortRaw);

  const filters = {
    status: statusRaw && statusRaw !== "all" ? (statusRaw as NotificationDispatchStatus) : undefined,
    channel: channelRaw && channelRaw !== "all" ? (channelRaw as NotificationChannel) : undefined,
    type:
      typeRaw && typeRaw !== "all" && Object.values(NotificationType).includes(typeRaw as NotificationType)
        ? (typeRaw as NotificationType)
        : undefined,
    query: queryRaw?.trim() || undefined,
    from: fromRaw ? new Date(fromRaw) : undefined,
    to: toRaw ? new Date(toRaw) : undefined,
  } as const;

  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const logs = await listNotificationLogs({
    filters,
    pagination: { page, pageSize: PAGE_SIZE },
    sort,
  });

  const totalPages = Math.max(1, Math.ceil(logs.total / logs.pageSize));

  const params = toSearchParams({
    ...searchParams,
    status: statusRaw ?? "all",
    channel: channelRaw ?? "all",
    sort: `${sort.field}:${sort.direction}`,
  });

  return (
    <div className="space-y-6" dir="rtl">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">گزارش ارسال اعلان‌ها</h1>
        <p className="text-sm text-muted-foreground">
          سوابق کامل ایمیل‌ها و اعلان‌های درون‌برنامه برای پیگیری مشکلات یا بررسی تحویل.
        </p>
      </header>

      <form className="rounded-xl border border-border bg-background p-4" method="get">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="q">جستجو</Label>
            <Input
              id="q"
              name="q"
              defaultValue={queryRaw ?? ""}
              placeholder="ایمیل، کلید عدم تکرار یا شناسه پیام"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">وضعیت</Label>
            <Select name="status" defaultValue={statusRaw ?? "all"}>
              <SelectTrigger id="status">
                <SelectValue placeholder="همه وضعیت‌ها" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="channel">کانال</Label>
            <Select name="channel" defaultValue={channelRaw ?? "all"}>
              <SelectTrigger id="channel">
                <SelectValue placeholder="همه کانال‌ها" />
              </SelectTrigger>
              <SelectContent>
                {channelOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">نوع رویداد</Label>
            <Select name="type" defaultValue={typeRaw ?? "all"}>
              <SelectTrigger id="type">
                <SelectValue placeholder="همه رویدادها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه رویدادها</SelectItem>
                {Object.values(NotificationType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="from">از تاریخ</Label>
            <Input id="from" name="from" type="date" defaultValue={fromRaw ?? ""} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">تا تاریخ</Label>
            <Input id="to" name="to" type="date" defaultValue={toRaw ?? ""} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sort">مرتب‌سازی</Label>
            <Select name="sort" defaultValue={sortRaw ?? "createdAt:desc"}>
              <SelectTrigger id="sort">
                <SelectValue placeholder="مرتب‌سازی" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button type="submit">اعمال فیلتر</Button>
          <Button asChild variant="outline">
            <Link href={PAGE_PATH}>پاک‌سازی</Link>
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse text-sm" dir="rtl">
          <thead>
            <tr className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 text-right">زمان ایجاد</th>
              <th className="px-3 py-2 text-right">کاربر</th>
              <th className="px-3 py-2 text-right">رویداد</th>
              <th className="px-3 py-2 text-right">کانال</th>
              <th className="px-3 py-2 text-right">وضعیت</th>
              <th className="px-3 py-2 text-right">تلاش‌ها</th>
              <th className="px-3 py-2 text-right">آخرین تلاش</th>
              <th className="px-3 py-2 text-right">شناسه ارائه‌دهنده</th>
              <th className="px-3 py-2 text-right">کلید عدم تکرار</th>
              <th className="px-3 py-2 text-right">خطا / متادیتا</th>
            </tr>
          </thead>
          <tbody>
            {logs.items.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">
                  رکوردی یافت نشد.
                </td>
              </tr>
            ) : (
              logs.items.map((log) => {
                const createdAtIso = toIsoString(log.createdAt);
                const lastAttemptIso = toIsoString(log.lastAttemptAt);
                return (
                  <tr key={log.id} className="border-b border-border/60">
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="font-medium text-foreground">
                          {formatJalaliDateTime(log.createdAt)}
                        </span>
                        {createdAtIso ? (
                          <span className="text-muted-foreground" dir="ltr">
                            {createdAtIso}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="font-medium text-foreground">
                          {log.user?.name ?? log.user?.email ?? "کاربر نامشخص"}
                        </span>
                        {log.email ? (
                          <span className="text-muted-foreground" dir="ltr">
                            {log.email}
                          </span>
                        ) : null}
                        {log.user?.email && log.user?.email !== log.email ? (
                          <span className="text-muted-foreground" dir="ltr">
                            ({log.user.email})
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="space-y-1 text-xs">
                        <span className="font-medium text-foreground">{log.eventType}</span>
                        {log.metadata ? (
                          <details className="rounded-md border border-border/50 bg-muted/30 p-2">
                            <summary className="cursor-pointer text-xs text-muted-foreground">
                              جزئیات
                            </summary>
                            <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-[11px] leading-5 text-muted-foreground">
                              {renderMetadata(log.metadata)}
                            </pre>
                          </details>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <Badge variant="outline">{formatChannel(log.channel)}</Badge>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <Badge variant={getStatusVariant(log.status)}>{log.status}</Badge>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col text-xs">
                        <span>{numberFormatter.format(log.attempts)}</span>
                        {log.error ? (
                          <span className="text-destructive">{log.error}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      {lastAttemptIso ? (
                        <div className="flex flex-col gap-1 text-xs">
                          <span>{jalaliDateTime.format(new Date(lastAttemptIso))}</span>
                          <span className="text-muted-foreground" dir="ltr">
                            {lastAttemptIso}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span className="text-xs" dir="ltr">
                        {log.providerMessageId ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span className="break-all text-xs" dir="ltr">
                        {log.dedupeKey}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top">
                      {log.error ? (
                        <span className="text-xs text-destructive">{log.error}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls basePath={PAGE_PATH} page={logs.page} totalPages={totalPages} searchParams={params} />
    </div>
  );
}

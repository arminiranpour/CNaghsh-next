"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Image as ImageIcon, MoreHorizontal, Video, RefreshCw, Trash2 } from "lucide-react";

import { AdminMediaDetail } from "@/components/admin/media/AdminMediaDetail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const STATUS_OPTIONS = [
  { value: "all", label: "همه وضعیت‌ها" },
  { value: "uploaded", label: "آپلود شده" },
  { value: "processing", label: "در حال پردازش" },
  { value: "ready", label: "آماده" },
  { value: "failed", label: "ناموفق" },
] as const;

const TYPE_OPTIONS = [
  { value: "all", label: "همه نوع‌ها" },
  { value: "video", label: "ویدیو" },
  { value: "image", label: "تصویر" },
] as const;

const MODERATION_OPTIONS = [
  { value: "all", label: "همه" },
  { value: "pending", label: "در انتظار بررسی" },
  { value: "approved", label: "تایید شده" },
  { value: "rejected", label: "رد شده" },
] as const;

const statusLabels: Record<string, string> = {
  uploaded: "آپلود شده",
  processing: "در حال پردازش",
  ready: "آماده",
  failed: "ناموفق",
};

const statusVariants: Record<string, "secondary" | "warning" | "success" | "destructive"> = {
  uploaded: "secondary",
  processing: "warning",
  ready: "success",
  failed: "destructive",
};

const moderationLabels: Record<string, string> = {
  pending: "در انتظار بررسی",
  approved: "تایید شده",
  rejected: "رد شده",
};

const moderationVariants: Record<string, "secondary" | "warning" | "success" | "destructive"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

const visibilityLabels: Record<string, string> = {
  public: "عمومی",
  private: "خصوصی",
};

const visibilityVariants: Record<string, "success" | "secondary"> = {
  public: "success",
  private: "secondary",
};

type StatusFilter = (typeof STATUS_OPTIONS)[number]["value"];
type TypeFilter = (typeof TYPE_OPTIONS)[number]["value"];
type ModerationFilter = (typeof MODERATION_OPTIONS)[number]["value"];

type FilterState = {
  status: StatusFilter;
  type: TypeFilter;
  moderation: ModerationFilter;
  user: string;
};

type AdminMediaListItem = {
  id: string;
  type: "image" | "video";
  status: string;
  visibility: "public" | "private";
  moderationStatus: "pending" | "approved" | "rejected";
  ownerUserId: string;
  ownerEmail?: string | null;
  createdAt: string;
  durationSec?: number | null;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
  errorMessage?: string | null;
};

type AdminMediaListResponse = {
  items: AdminMediaListItem[];
  nextCursor?: string | null;
};

type AdminMediaAction =
  | { type: "REQUEUE_TRANSCODE"; mediaId: string }
  | { type: "MARK_REJECTED"; mediaId: string; reason?: string }
  | { type: "TOGGLE_VISIBILITY"; mediaId: string; visibility: "public" | "private" }
  | { type: "DELETE_MEDIA"; mediaId: string };

const numberFormatter = new Intl.NumberFormat("fa-IR");
const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" });

const formatDuration = (value: number | null | undefined) => {
  if (!value || value <= 0) {
    return "-";
  }
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${numberFormatter.format(minutes)}:${`${seconds}`.padStart(2, "0")}`;
};

const formatResolution = (width: number | null | undefined, height: number | null | undefined) => {
  if (!width || !height) {
    return "-";
  }
  return `${numberFormatter.format(width)}×${numberFormatter.format(height)}`;
};

const formatSize = (value: number | null | undefined) => {
  if (!value || value <= 0) {
    return "-";
  }
  const megabytes = value / (1024 * 1024);
  const rounded = Math.round(megabytes * 10) / 10;
  return `${numberFormatter.format(rounded)} مگابایت`;
};

export function AdminMediaTable() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<FilterState>({ status: "all", type: "all", moderation: "all", user: "" });
  const [items, setItems] = useState<AdminMediaListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ mediaId: string; ownerEmail: string | null } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCursor(null);
    setCursorHistory([]);
  }, []);

  const clearFilters = () => {
    setFilters({ status: "all", type: "all", moderation: "all", user: "" });
    setCursor(null);
    setCursorHistory([]);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.status !== "all") {
          params.set("status", filters.status);
        }
        if (filters.type !== "all") {
          params.set("type", filters.type);
        }
        if (filters.moderation !== "all") {
          params.set("moderation", filters.moderation);
        }
        if (filters.user.trim().length > 0) {
          params.set("user", filters.user.trim());
        }
        if (cursor) {
          params.set("cursor", cursor);
        }
        const response = await fetch(`/api/admin/media/list?${params.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("خطایی در دریافت داده رخ داد.");
        }
        const body = (await response.json()) as AdminMediaListResponse;
        if (cancelled) {
          return;
        }
        setItems(body.items);
        setNextCursor(body.nextCursor ?? null);
      } catch (err) {
        if (!cancelled) {
          setItems([]);
          setNextCursor(null);
          setError(err instanceof Error ? err.message : "خطای ناشناخته رخ داد.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [filters, cursor, refreshKey]);

  const performAction = useCallback(
    async (payload: AdminMediaAction, successMessage: string) => {
      setActionPendingId(payload.mediaId);
      try {
        const response = await fetch("/api/admin/media/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await response.json()) as { ok: boolean; error?: string };
        if (!response.ok || !body.ok) {
          throw new Error(body.error ?? "عملیات ناموفق بود.");
        }
        toast({ title: successMessage });
        setRefreshKey((prev) => prev + 1);
        return true;
      } catch (err) {
        toast({ variant: "destructive", title: "خطا", description: err instanceof Error ? err.message : "عملیات ناموفق بود." });
        return false;
      } finally {
        setActionPendingId(null);
      }
    },
    [toast],
  );

  const handleRequeue = (mediaId: string) => {
    performAction({ type: "REQUEUE_TRANSCODE", mediaId }, "رسانه برای پردازش مجدد در صف قرار گرفت.");
  };

  const handleToggleVisibility = (row: AdminMediaListItem) => {
    const nextVisibility = row.visibility === "public" ? "private" : "public";
    const message = nextVisibility === "public" ? "رسانه عمومی شد." : "رسانه خصوصی شد.";
    performAction({ type: "TOGGLE_VISIBILITY", mediaId: row.id, visibility: nextVisibility }, message);
  };

  const handleDelete = (mediaId: string) => {
    const confirmed = window.confirm("آیا از حذف این رسانه اطمینان دارید؟");
    if (!confirmed) {
      return;
    }
    performAction({ type: "DELETE_MEDIA", mediaId }, "رسانه حذف شد.");
  };

  const openRejectDialog = (row: AdminMediaListItem) => {
    setRejectTarget({ mediaId: row.id, ownerEmail: row.ownerEmail ?? null });
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectTarget) {
      return;
    }
    const ok = await performAction(
      { type: "MARK_REJECTED", mediaId: rejectTarget.mediaId, reason: rejectReason },
      "رسانه با موفقیت رد شد.",
    );
    if (ok) {
      setRejectTarget(null);
      setRejectReason("");
    }
  };

  const handleOwnerFilter = (value: string) => {
    updateFilter("user", value);
  };

  const handleNextPage = () => {
    if (!nextCursor) {
      return;
    }
    setCursorHistory((prev) => [...prev, cursor]);
    setCursor(nextCursor);
  };

  const handlePrevPage = () => {
    setCursorHistory((prev) => {
      if (prev.length === 0) {
        setCursor(null);
        return prev;
      }
      const previous = prev[prev.length - 1];
      setCursor(previous);
      return prev.slice(0, -1);
    });
  };

  const openDetail = (mediaId: string) => {
    setSelectedMediaId(mediaId);
    setDetailOpen(true);
  };

  const handleDetailOpenChange = (open: boolean) => {
    setDetailOpen(open);
    if (!open) {
      setSelectedMediaId(null);
    }
  };

  const handleDetailActionComplete = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const hasPrev = cursorHistory.length > 0;
  const hasNext = Boolean(nextCursor);

  const rows = useMemo(() => items, [items]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filters.status} onValueChange={(value: StatusFilter) => updateFilter("status", value)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="وضعیت" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.type} onValueChange={(value: TypeFilter) => updateFilter("type", value)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="نوع" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.moderation} onValueChange={(value: ModerationFilter) => updateFilter("moderation", value)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="وضعیت بررسی" />
          </SelectTrigger>
          <SelectContent>
            {MODERATION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          className="w-64"
          placeholder="جستجوی ایمیل یا شناسه"
          value={filters.user}
          onChange={(event) => updateFilter("user", event.target.value)}
        />

        <Button variant="ghost" onClick={clearFilters} className="text-sm">
          پاک‌سازی فیلترها
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">انتخاب</TableHead>
              <TableHead className="w-16 text-center">نوع</TableHead>
              <TableHead>وضعیت‌ها</TableHead>
              <TableHead>نمایش</TableHead>
              <TableHead>کاربر</TableHead>
              <TableHead>تاریخ ایجاد</TableHead>
              <TableHead>مدت / رزولوشن</TableHead>
              <TableHead>حجم</TableHead>
              <TableHead>آخرین خطا</TableHead>
              <TableHead className="text-center">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="py-10">
                  <div className="flex justify-center">
                    <Skeleton className="h-6 w-40" />
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={10} className="py-6 text-center text-sm text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-6 text-center text-sm text-muted-foreground">
                  رسانه‌ای برای نمایش وجود ندارد.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const isPending = actionPendingId === row.id;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-center">
                      <input type="checkbox" disabled className="h-4 w-4" />
                    </TableCell>
                    <TableCell className="text-center">
                      {row.type === "video" ? (
                        <Video className="mx-auto h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ImageIcon className="mx-auto h-5 w-5 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariants[row.status] ?? "secondary"}>
                          {statusLabels[row.status] ?? row.status}
                        </Badge>
                        <Badge variant={moderationVariants[row.moderationStatus] ?? "secondary"}>
                          {moderationLabels[row.moderationStatus] ?? row.moderationStatus}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={visibilityVariants[row.visibility] ?? "secondary"}>
                        {visibilityLabels[row.visibility] ?? row.visibility}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        {row.ownerEmail ? (
                          <button
                            type="button"
                            className="text-right text-primary hover:underline"
                            onClick={() => handleOwnerFilter(row.ownerEmail ?? "")}
                          >
                            {row.ownerEmail}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">بدون ایمیل</span>
                        )}
                        <span className="text-xs text-muted-foreground">{row.ownerUserId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {dateTimeFormatter.format(new Date(row.createdAt))}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div>{formatDuration(row.durationSec ?? null)}</div>
                      <div>{formatResolution(row.width ?? null, row.height ?? null)}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatSize(row.sizeBytes ?? null)}</TableCell>
                    <TableCell className="max-w-xs text-sm text-muted-foreground">
                      <span className="line-clamp-2 break-words">{row.errorMessage ?? "-"}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openDetail(row.id)}>
                          جزئیات
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" disabled={isPending}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">باز کردن منو</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onSelect={(event: Event) => {
                                event.preventDefault();
                                handleRequeue(row.id);
                              }}
                            >
                              <RefreshCw className="ml-2 h-4 w-4" /> صف مجدد ترنسکد
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(event: Event) => {
                                event.preventDefault();
                                openRejectDialog(row);
                              }}
                            >
                              رد کردن
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(event: Event) => {
                                event.preventDefault();
                                handleToggleVisibility(row);
                              }}
                            >
                              {row.visibility === "public" ? (
                                <EyeOff className="ml-2 h-4 w-4" />
                              ) : (
                                <Eye className="ml-2 h-4 w-4" />
                              )}
                              تغییر نمایش
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(event: Event) => {
                                event.preventDefault();
                                handleDelete(row.id);
                              }}
                            >
                              <Trash2 className="ml-2 h-4 w-4" /> حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {rows.length > 0 ? `${numberFormatter.format(rows.length)} مورد نمایش داده می‌شود` : "بدون داده"}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={!hasPrev}>
            قبلی
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!hasNext}>
            بعدی
          </Button>
        </div>
      </div>

      <AdminMediaDetail
        mediaId={selectedMediaId}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
        onActionComplete={handleDetailActionComplete}
      />

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent dir="rtl">
          <DialogHeader className="space-y-1 text-right">
            <DialogTitle>رد کردن رسانه</DialogTitle>
            {rejectTarget?.ownerEmail ? (
              <DialogDescription>برای کاربر {rejectTarget.ownerEmail}</DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="reject-reason">دلیل رد کردن</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="توضیح کوتاه درباره علت رد"
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter className="justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">انصراف</Button>
            </DialogClose>
            <Button
              onClick={confirmReject}
              disabled={!rejectTarget || actionPendingId === rejectTarget.mediaId}
              variant="destructive"
            >
              رد کردن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

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

const moderationVariants: Record<string, "warning" | "success" | "destructive" | "secondary"> = {
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

const jobStatusLabels: Record<string, string> = {
  queued: "در صف",
  processing: "در حال پردازش",
  done: "موفق",
  failed: "ناموفق",
};

const jobStatusVariants: Record<string, "secondary" | "warning" | "success" | "destructive"> = {
  queued: "secondary",
  processing: "warning",
  done: "success",
  failed: "destructive",
};

const numberFormatter = new Intl.NumberFormat("fa-IR");
const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const formatDuration = (value: number | null) => {
  if (!value || value <= 0) {
    return "نامشخص";
  }
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  const minutesLabel = minutes > 0 ? `${numberFormatter.format(minutes)} دقیقه` : "";
  const secondsLabel = `${numberFormatter.format(seconds)} ثانیه`;
  return minutesLabel ? `${minutesLabel} و ${secondsLabel}` : secondsLabel;
};

const formatSize = (value: number | null) => {
  if (!value || value <= 0) {
    return "نامشخص";
  }
  const megabytes = value / (1024 * 1024);
  const rounded = Math.round(megabytes * 10) / 10;
  return `${numberFormatter.format(rounded)} مگابایت`;
};

const formatBitrate = (value: number | null) => {
  if (!value || value <= 0) {
    return "نامشخص";
  }
  const kbps = Math.round(value / 1000);
  return `${numberFormatter.format(kbps)} کیلوبیت بر ثانیه`;
};

type MediaDetail = {
  id: string;
  type: "image" | "video";
  status: string;
  visibility: "public" | "private";
  moderationStatus: string;
  moderationReason: string | null;
  moderationReviewedAt: string | null;
  moderationReviewedBy: { id: string; email: string | null } | null;
  owner: { id: string; email: string | null };
  sourceKey: string;
  outputKey: string | null;
  posterKey: string | null;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  codec: string | null;
  bitrate: number | null;
  sizeBytes: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  lastJob: {
    id: string;
    status: string;
    attempt: number;
    startedAt: string | null;
    finishedAt: string | null;
    logs: unknown;
  } | null;
};

type AdminMediaDetailProps = {
  mediaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionComplete?: () => void;
};

export function AdminMediaDetail({ mediaId, open, onOpenChange, onActionComplete }: AdminMediaDetailProps) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState(false);
  const [reason, setReason] = useState("");

  const loadDetail = useCallback(
    async (signal?: AbortSignal) => {
      if (!mediaId) {
        setDetail(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/media/${mediaId}/detail`, {
          cache: "no-store",
          signal,
        });
        if (!response.ok) {
          throw new Error(response.status === 404 ? "رسانه یافت نشد." : "خطایی در دریافت اطلاعات رخ داد.");
        }
        const body = (await response.json()) as MediaDetail;
        if (signal?.aborted) {
          return;
        }
        setDetail(body);
        setReason(body.moderationReason ?? "");
      } catch (err) {
        if (signal?.aborted) {
          return;
        }
        setDetail(null);
        setError(err instanceof Error ? err.message : "خطای ناشناخته رخ داد.");
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [mediaId],
  );

  useEffect(() => {
    if (!open || !mediaId) {
      setDetail(null);
      setError(null);
      setReason("");
      return;
    }
    const controller = new AbortController();
    loadDetail(controller.signal);
    return () => {
      controller.abort();
    };
  }, [open, mediaId, loadDetail]);

  const handleAction = useCallback(
    async (
      payload: unknown,
      successMessage: string,
      options?: { skipReload?: boolean; onSuccess?: () => void },
    ) => {
      if (!mediaId) {
        return;
      }
      setPendingAction(true);
      try {
        const response = await fetch("/api/admin/media/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await response.json()) as { ok: boolean; error?: string };
        if (!response.ok || !body.ok) {
          throw new Error(body.error ?? "خطایی رخ داد.");
        }
        toast({ title: successMessage });
        if (onActionComplete) {
          onActionComplete();
        }
        if (!options?.skipReload) {
          await loadDetail();
        }
        if (options?.onSuccess) {
          options.onSuccess();
        }
      } catch (err) {
        toast({ variant: "destructive", title: "خطا", description: err instanceof Error ? err.message : "عملیات ناموفق بود." });
      } finally {
        setPendingAction(false);
      }
    },
    [loadDetail, mediaId, onActionComplete, toast],
  );

  const handleRequeue = () => {
    handleAction({ type: "REQUEUE_TRANSCODE", mediaId }, "رسانه برای پردازش مجدد در صف قرار گرفت.");
  };

  const handleApprove = () => {
    handleAction({ type: "TOGGLE_VISIBILITY", mediaId, visibility: "public" }, "رسانه تایید و عمومی شد.");
  };

  const handleToggleVisibility = () => {
    if (!detail) {
      return;
    }
    const nextVisibility = detail.visibility === "public" ? "private" : "public";
    const message = nextVisibility === "public" ? "رسانه به حالت عمومی تغییر یافت." : "رسانه خصوصی شد.";
    handleAction({ type: "TOGGLE_VISIBILITY", mediaId, visibility: nextVisibility }, message);
  };

  const handleReject = () => {
    handleAction(
      { type: "MARK_REJECTED", mediaId, reason },
      "رسانه با موفقیت رد شد.",
    );
  };

  const handleDelete = () => {
    if (!mediaId) {
      return;
    }
    const confirmed = window.confirm("آیا از حذف این رسانه اطمینان دارید؟");
    if (!confirmed) {
      return;
    }
    handleAction(
      { type: "DELETE_MEDIA", mediaId },
      "رسانه حذف شد.",
      {
        skipReload: true,
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  const renderLogs = (logs: unknown) => {
    if (logs === null || logs === undefined) {
      return "اطلاعاتی ثبت نشده است.";
    }
    if (typeof logs === "string") {
      return logs;
    }
    try {
      return JSON.stringify(logs, null, 2);
    } catch (error) {
      return String(logs);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4" dir="rtl">
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }
    if (error) {
      return <p className="text-sm text-destructive">{error}</p>;
    }
    if (!detail) {
      return <p className="text-sm text-muted-foreground">اطلاعاتی برای نمایش وجود ندارد.</p>;
    }
    return (
      <div className="space-y-6 text-sm" dir="rtl">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[detail.status] ?? "secondary"}>{statusLabels[detail.status] ?? detail.status}</Badge>
            <Badge variant={moderationVariants[detail.moderationStatus] ?? "secondary"}>
              {moderationLabels[detail.moderationStatus] ?? detail.moderationStatus}
            </Badge>
            <Badge variant={visibilityVariants[detail.visibility] ?? "secondary"}>
              {visibilityLabels[detail.visibility] ?? detail.visibility}
            </Badge>
          </div>
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <div>
              <span className="font-medium text-foreground">مالک:</span> {detail.owner.email ?? detail.owner.id}
            </div>
            <div>
              <span className="font-medium text-foreground">شناسه کاربر:</span> {detail.owner.id}
            </div>
            <div>
              <span className="font-medium text-foreground">تاریخ ایجاد:</span> {dateTimeFormatter.format(new Date(detail.createdAt))}
            </div>
            <div>
              <span className="font-medium text-foreground">آخرین به‌روزرسانی:</span> {dateTimeFormatter.format(new Date(detail.updatedAt))}
            </div>
            {detail.moderationReviewedAt ? (
              <div>
                <span className="font-medium text-foreground">تاریخ بررسی:</span> {dateTimeFormatter.format(new Date(detail.moderationReviewedAt))}
              </div>
            ) : null}
            {detail.moderationReviewedBy ? (
              <div>
                <span className="font-medium text-foreground">بررسی توسط:</span> {detail.moderationReviewedBy.email ?? detail.moderationReviewedBy.id}
              </div>
            ) : null}
          </div>
          {detail.errorMessage ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
              آخرین خطا: {detail.errorMessage}
            </div>
          ) : null}
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">اطلاعات فنی</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">مدت زمان:</span> {formatDuration(detail.durationSec)}
            </div>
            <div>
              <span className="text-muted-foreground">رزولوشن:</span>{" "}
              {detail.width && detail.height ? `${numberFormatter.format(detail.width)}×${numberFormatter.format(detail.height)}` : "نامشخص"}
            </div>
            <div>
              <span className="text-muted-foreground">کدک:</span> {detail.codec ?? "نامشخص"}
            </div>
            <div>
              <span className="text-muted-foreground">بیت‌ریت:</span> {formatBitrate(detail.bitrate)}
            </div>
            <div>
              <span className="text-muted-foreground">حجم فایل:</span> {formatSize(detail.sizeBytes)}
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">کلیدها</h3>
          <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
            <div className="flex flex-col gap-1 break-all">
              <span className="text-muted-foreground">سورس:</span>
              <code className="font-mono">{detail.sourceKey}</code>
            </div>
            {detail.outputKey ? (
              <div className="flex flex-col gap-1 break-all">
                <span className="text-muted-foreground">خروجی:</span>
                <code className="font-mono">{detail.outputKey}</code>
              </div>
            ) : null}
            {detail.posterKey ? (
              <div className="flex flex-col gap-1 break-all">
                <span className="text-muted-foreground">پوستر:</span>
                <code className="font-mono">{detail.posterKey}</code>
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">اطلاعات تراسکد</h3>
          {detail.lastJob ? (
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={jobStatusVariants[detail.lastJob.status] ?? "secondary"}>
                  {jobStatusLabels[detail.lastJob.status] ?? detail.lastJob.status}
                </Badge>
                <span className="text-xs text-muted-foreground">تلاش #{numberFormatter.format(detail.lastJob.attempt)}</span>
              </div>
              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div>
                  شروع: {detail.lastJob.startedAt ? dateTimeFormatter.format(new Date(detail.lastJob.startedAt)) : "نامشخص"}
                </div>
                <div>
                  پایان: {detail.lastJob.finishedAt ? dateTimeFormatter.format(new Date(detail.lastJob.finishedAt)) : "نامشخص"}
                </div>
              </div>
              <div className="mt-2 max-h-48 overflow-auto rounded-md bg-muted/30 p-2 text-xs">
                <pre className="whitespace-pre-wrap break-words">{renderLogs(detail.lastJob.logs)}</pre>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">هیچ تراسکدی ثبت نشده است.</p>
          )}
        </section>

        <section className="space-y-2">
          <Label htmlFor="moderation-reason" className="text-sm font-semibold text-foreground">
            دلیل رد کردن
          </Label>
          <Textarea
            id="moderation-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="در صورت رد رسانه، دلیل را اینجا ثبت کنید"
            className="min-h-[96px]"
          />
        </section>

        <section className="flex flex-wrap gap-2">
          <Button onClick={handleRequeue} disabled={pendingAction} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" /> صف مجدد ترنسکد
          </Button>
          <Button onClick={handleApprove} disabled={pendingAction || detail.moderationStatus === "approved"} className="bg-emerald-600 text-white hover:bg-emerald-700">
            تایید
          </Button>
          <Button onClick={handleReject} disabled={pendingAction} variant="destructive" className="gap-2">
            رد کردن
          </Button>
          <Button onClick={handleToggleVisibility} disabled={pendingAction} variant="outline" className="gap-2">
            {detail.visibility === "public" ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            تغییر نمایش
          </Button>
          <Button onClick={handleDelete} disabled={pendingAction} variant="destructive" className="gap-2">
            <Trash2 className="h-4 w-4" /> حذف
          </Button>
        </section>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl space-y-4" dir="rtl">
        <DialogHeader className="space-y-1 text-right">
          <DialogTitle>جزئیات رسانه</DialogTitle>
          {detail ? <DialogDescription className="text-xs">شناسه رسانه: {detail.id}</DialogDescription> : null}
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

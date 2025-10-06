"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import {
  approveAction,
  bulkAction,
  hideAction,
  rejectAction,
  unhideAction,
} from "../actions";

type ModerationRow = {
  id: string;
  displayName: string;
  cityName: string;
  age: number | null;
  skills: Array<{ key: string; label: string }>;
  avatarUrl: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  moderationStatus: "PENDING" | "APPROVED" | "REJECTED";
  updatedAt: string;
};

type Props = {
  rows: ModerationRow[];
  total: number;
  page: number;
  pageSize: number;
};

type RejectDialogState = {
  ids: string[];
  open: boolean;
};

const STATUS_LABELS: Record<ModerationRow["moderationStatus"], string> = {
  PENDING: "در انتظار بررسی",
  APPROVED: "تایید شده",
  REJECTED: "رد شده",
};

const STATUS_VARIANTS: Record<ModerationRow["moderationStatus"], "warning" | "success" | "destructive"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
};

const VISIBILITY_LABELS: Record<ModerationRow["visibility"], string> = {
  PUBLIC: "منتشر",
  PRIVATE: "غیرمنتشر",
};

export function ModerationTable({ rows, total, page, pageSize }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectDialog, setRejectDialog] = useState<RejectDialogState>({ ids: [], open: false });
  const [rejectReason, setRejectReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => rows.some((row) => row.id === id)));
  }, [rows]);

  const allSelected = useMemo(() => {
    return rows.length > 0 && selectedIds.length === rows.length;
  }, [rows.length, selectedIds.length]);

  const toggleSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map((row) => row.id));
    }
  };

  const handleApprove = (ids: string[]) => {
    if (!ids.length) return;

    startTransition(async () => {
      let result;
      if (ids.length === 1) {
        result = await approveAction(ids[0]);
      } else {
        result = await bulkAction({ type: "APPROVE", ids });
      }

      if (!result?.ok) {
        toast({ variant: "destructive", description: result?.error ?? "خطا در تایید پروفایل." });
        return;
      }

      toast({ description: "پروفایل‌ها تایید شدند." });
      setSelectedIds([]);
      router.refresh();
    });
  };

  const handleVisibility = (ids: string[], type: "HIDE" | "UNHIDE") => {
    if (!ids.length) return;

    startTransition(async () => {
      let result;
      if (ids.length === 1) {
        result = type === "HIDE" ? await hideAction(ids[0]) : await unhideAction(ids[0]);
      } else {
        result = await bulkAction({ type, ids });
      }

      if (!result?.ok) {
        toast({ variant: "destructive", description: result?.error ?? "خطا در بروزرسانی نمایش." });
        return;
      }

      toast({ description: type === "HIDE" ? "پروفایل‌ها مخفی شدند." : "پروفایل‌ها نمایش داده شدند." });
      setSelectedIds([]);
      router.refresh();
    });
  };

  const submitReject = (ids: string[], reason: string) => {
    const trimmed = reason.trim();
    if (!ids.length || !trimmed) {
      toast({ variant: "destructive", description: "وارد کردن دلیل رد الزامی است." });
      return;
    }

    startTransition(async () => {
      let result;
      if (ids.length === 1) {
        result = await rejectAction(ids[0], trimmed);
      } else {
        result = await bulkAction({ type: "REJECT", ids, payload: { reason: trimmed } });
      }

      if (!result?.ok) {
        toast({ variant: "destructive", description: result?.error ?? "خطا در رد پروفایل." });
        return;
      }

      toast({ description: "پروفایل‌ها رد شدند." });
      setSelectedIds([]);
      setRejectDialog({ ids: [], open: false });
      setRejectReason("");
      router.refresh();
    });
  };

  const openRejectDialog = (ids: string[]) => {
    setRejectReason("");
    setRejectDialog({ ids, open: true });
  };

  const closeRejectDialog = () => {
    setRejectDialog({ ids: [], open: false });
    setRejectReason("");
  };

  const totalStart = (page - 1) * pageSize + 1;
  const totalEnd = Math.min(total, page * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          نمایش {rows.length ? `${totalStart}-${totalEnd}` : 0} از {total} پروفایل
        </span>
        {selectedIds.length ? (
          <span>{selectedIds.length} پروفایل انتخاب شده</span>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 accent-primary"
                  aria-label="انتخاب همه"
                />
              </TableHead>
              <TableHead>کاربر</TableHead>
              <TableHead>شهر</TableHead>
              <TableHead>سن</TableHead>
              <TableHead>مهارت‌ها</TableHead>
              <TableHead>نمایش</TableHead>
              <TableHead>وضعیت ممیزی</TableHead>
              <TableHead>آخرین بروزرسانی</TableHead>
              <TableHead className="text-left">اقدامات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  موردی برای نمایش یافت نشد.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} data-state={selectedIds.includes(row.id) ? "selected" : undefined}>
                  <TableCell className="text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => toggleSelection(row.id)}
                      className="h-4 w-4 accent-primary"
                      aria-label={`انتخاب ${row.displayName}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-md border border-border">
                        {row.avatarUrl ? (
                          <Image
                            src={row.avatarUrl}
                            alt={`تصویر ${row.displayName}`}
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                            بدون تصویر
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium">{row.displayName}</div>
                        <div className="text-xs text-muted-foreground">{row.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{row.cityName}</TableCell>
                  <TableCell>{row.age ?? "--"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.skills.length ? (
                        row.skills.map((skill) => (
                          <Badge key={skill.key} variant="outline">
                            {skill.label}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">بدون مهارت</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.visibility === "PUBLIC" ? "secondary" : "outline"}>
                      {VISIBILITY_LABELS[row.visibility]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[row.moderationStatus]}>
                      {STATUS_LABELS[row.moderationStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(row.updatedAt).toLocaleString("fa-IR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell className="space-x-1 space-x-reverse text-left">
                    <Button
                      variant="default"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleApprove([row.id])}
                    >
                      تایید
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => openRejectDialog([row.id])}
                    >
                      رد با دلیل
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() =>
                        handleVisibility([row.id], row.visibility === "PUBLIC" ? "HIDE" : "UNHIDE")
                      }
                    >
                      {row.visibility === "PUBLIC" ? "عدم نمایش" : "نمایش"}
                    </Button>
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/admin/moderation/${row.id}`}>جزئیات</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedIds.length ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-4">
          <div className="text-sm font-medium">اقدامات گروهی</div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => handleApprove(selectedIds)}
            >
              تایید
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => openRejectDialog(selectedIds)}
            >
              رد با دلیل
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => handleVisibility(selectedIds, "HIDE")}
            >
              عدم نمایش
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => handleVisibility(selectedIds, "UNHIDE")}
            >
              نمایش
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={rejectDialog.open} onOpenChange={(open) => (!open ? closeRejectDialog() : null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رد پروفایل</DialogTitle>
            <DialogDescription>لطفاً دلیل رد پروفایل را وارد کنید.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="دلیل رد..."
            rows={5}
          />
          <DialogFooter className="justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeRejectDialog} disabled={isPending}>
              انصراف
            </Button>
            <Button
              type="button"
              onClick={() => submitReject(rejectDialog.ids, rejectReason)}
              disabled={isPending}
            >
              ثبت رد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

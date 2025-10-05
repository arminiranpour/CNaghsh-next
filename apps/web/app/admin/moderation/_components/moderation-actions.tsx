"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import {
  approveAction,
  hideAction,
  rejectAction,
  revertPendingAction,
  unhideAction,
} from "../actions";

type Props = {
  profileId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  visibility: "PUBLIC" | "PRIVATE";
};

export function ModerationActions({ profileId, status, visibility }: Props) {
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [revertNote, setRevertNote] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveAction(profileId);
      if (!result?.ok) {
        toast({ variant: "destructive", description: result?.error ?? "خطا در تایید پروفایل." });
        return;
      }

      toast({ description: "پروفایل تایید شد." });
      router.refresh();
    });
  };

  const handleReject = () => {
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      toast({ variant: "destructive", description: "لطفاً دلیل رد را وارد کنید." });
      return;
    }

    startTransition(async () => {
      const result = await rejectAction(profileId, trimmed);
      if (!result?.ok) {
        toast({ variant: "destructive", description: result?.error ?? "خطا در رد پروفایل." });
        return;
      }

      toast({ description: "پروفایل رد شد." });
      setRejectOpen(false);
      setRejectReason("");
      router.refresh();
    });
  };

  const handleRevert = () => {
    const trimmed = revertNote.trim();

    startTransition(async () => {
      const result = await revertPendingAction(profileId, trimmed ? trimmed : undefined);
      if (!result?.ok) {
        toast({ variant: "destructive", description: result?.error ?? "خطا در بازگردانی پروفایل." });
        return;
      }

      toast({ description: "پروفایل به حالت بررسی بازگشت." });
      setRevertOpen(false);
      setRevertNote("");
      router.refresh();
    });
  };

  const handleVisibility = () => {
    startTransition(async () => {
      const result =
        visibility === "PUBLIC" ? await hideAction(profileId) : await unhideAction(profileId);

      if (!result?.ok) {
        toast({ variant: "destructive", description: result?.error ?? "خطا در بروزرسانی نمایش." });
        return;
      }

      toast({ description: visibility === "PUBLIC" ? "پروفایل مخفی شد." : "پروفایل نمایش داده شد." });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap gap-2" dir="rtl">
      <Button onClick={handleApprove} disabled={isPending}>
        تایید
      </Button>
      <Button variant="outline" onClick={() => setRejectOpen(true)} disabled={isPending}>
        رد با دلیل
      </Button>
      <Button
        variant="outline"
        onClick={() => setRevertOpen(true)}
        disabled={isPending || status === "PENDING"}
      >
        بازگردانی به بررسی
      </Button>
      <Button variant="outline" onClick={handleVisibility} disabled={isPending}>
        {visibility === "PUBLIC" ? "عدم نمایش" : "نمایش"}
      </Button>

      <Dialog open={rejectOpen} onOpenChange={(open) => (!open ? setRejectOpen(false) : null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رد پروفایل</DialogTitle>
            <DialogDescription>دلیل رد پروفایل را وارد کنید.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="دلیل رد..."
            rows={5}
          />
          <DialogFooter className="justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={isPending}>
              انصراف
            </Button>
            <Button onClick={handleReject} disabled={isPending}>
              ثبت رد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revertOpen} onOpenChange={(open) => (!open ? setRevertOpen(false) : null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>بازگردانی به بررسی</DialogTitle>
            <DialogDescription>در صورت نیاز یادداشتی برای تیم خود وارد کنید.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={revertNote}
            onChange={(event) => setRevertNote(event.target.value)}
            placeholder="یادداشت اختیاری..."
            rows={4}
          />
          <DialogFooter className="justify-end gap-2">
            <Button variant="outline" onClick={() => setRevertOpen(false)} disabled={isPending}>
              انصراف
            </Button>
            <Button onClick={handleRevert} disabled={isPending}>
              بازگردانی
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

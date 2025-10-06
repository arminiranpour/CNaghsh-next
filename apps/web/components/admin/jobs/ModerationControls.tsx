"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { type JobModeration } from "@prisma/client";

import { approveJobAction, rejectJobAction, suspendJobAction } from "@/app/(admin)/admin/jobs/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const SUCCESS_MESSAGES = {
  approve: "آگهی تأیید شد.",
  reject: "آگهی رد شد و به مالک اطلاع داده شد.",
  suspend: "آگهی معلق شد.",
} as const;

const ERROR_MESSAGE = "خطایی رخ داد. لطفاً دوباره تلاش کنید.";

type ModerationControlsProps = {
  jobId: string;
  moderation: JobModeration;
};

function shouldShowApprove(moderation: JobModeration): boolean {
  return (
    moderation === "PENDING" ||
    moderation === "REJECTED" ||
    moderation === "SUSPENDED"
  );
}

function shouldShowReject(moderation: JobModeration): boolean {
  return moderation === "PENDING" || moderation === "APPROVED" || moderation === "SUSPENDED";
}

function shouldShowSuspend(moderation: JobModeration): boolean {
  return moderation !== "SUSPENDED";
}

export function ModerationControls({ jobId, moderation }: ModerationControlsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(() => {
      approveJobAction(jobId)
        .then((result) => {
          if (result.ok) {
            toast({ title: SUCCESS_MESSAGES.approve });
            router.refresh();
          } else {
            toast({ variant: "destructive", title: "خطا", description: result.error ?? ERROR_MESSAGE });
          }
        })
        .catch(() => {
          toast({ variant: "destructive", title: "خطا", description: ERROR_MESSAGE });
        });
    });
  };

  const handleReject = () => {
    const note = window.prompt("دلیل رد آگهی را وارد کنید (اختیاری)");

    startTransition(() => {
      rejectJobAction(jobId, note ?? undefined)
        .then((result) => {
          if (result.ok) {
            toast({ title: SUCCESS_MESSAGES.reject });
            router.refresh();
          } else {
            toast({ variant: "destructive", title: "خطا", description: result.error ?? ERROR_MESSAGE });
          }
        })
        .catch(() => {
          toast({ variant: "destructive", title: "خطا", description: ERROR_MESSAGE });
        });
    });
  };

  const handleSuspend = () => {
    const note = window.prompt("دلیل تعلیق را وارد کنید (اختیاری)");

    startTransition(() => {
      suspendJobAction(jobId, note ?? undefined)
        .then((result) => {
          if (result.ok) {
            toast({ title: SUCCESS_MESSAGES.suspend });
            router.refresh();
          } else {
            toast({ variant: "destructive", title: "خطا", description: result.error ?? ERROR_MESSAGE });
          }
        })
        .catch(() => {
          toast({ variant: "destructive", title: "خطا", description: ERROR_MESSAGE });
        });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {shouldShowApprove(moderation) ? (
        <Button size="sm" variant="secondary" disabled={isPending} onClick={handleApprove}>
          تأیید
        </Button>
      ) : null}
      {shouldShowReject(moderation) ? (
        <Button size="sm" variant="destructive" disabled={isPending} onClick={handleReject}>
          رد کردن
        </Button>
      ) : null}
      {shouldShowSuspend(moderation) ? (
        <Button size="sm" variant="outline" disabled={isPending} onClick={handleSuspend}>
          تعلیق
        </Button>
      ) : null}
    </div>
  );
}

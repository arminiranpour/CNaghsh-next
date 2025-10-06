"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";

import {
  closeJobAction,
  publishJobAction,
  republishJobAction,
  type SimpleActionResult,
} from "@/app/(dashboard)/dashboard/jobs/actions";

import { ModerationBadge } from "./ModerationBadge";
import { StatusBadge } from "./StatusBadge";

type JobRowProps = {
  job: {
    id: string;
    title: string;
    status: "DRAFT" | "PUBLISHED" | "CLOSED";
    moderation: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
    createdAt: string;
    views: number;
  };
};

const SUCCESS_MESSAGES = {
  publish: "آگهی برای بررسی ارسال شد.",
  close: "آگهی بسته شد.",
  republish: "آگهی دوباره برای بررسی ارسال شد.",
} as const;

const DEFAULT_ERROR_MESSAGE = "خطایی رخ داد. لطفاً دوباره تلاش کنید.";

export function JobRow({ job }: JobRowProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const formattedDate = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
    });
    return formatter.format(new Date(job.createdAt));
  }, [job.createdAt]);

  const formattedViews = useMemo(() => {
    return new Intl.NumberFormat("fa-IR").format(job.views ?? 0);
  }, [job.views]);

  const handleAction = (type: "publish" | "close" | "republish") => {
    startTransition(() => {
      const actionPromise =
        type === "publish"
          ? publishJobAction(job.id)
          : type === "close"
            ? closeJobAction(job.id)
            : republishJobAction(job.id);

      actionPromise
        .then((result: SimpleActionResult) => {
          if (result.ok) {
            toast({ title: SUCCESS_MESSAGES[type] });
            router.refresh();
          } else {
            const description = result.error ?? DEFAULT_ERROR_MESSAGE;
            toast({
              variant: "destructive",
              title: "خطا",
              description,
              action: result.cta ? (
                <ToastAction altText={result.cta.label} asChild>
                  <Link href={result.cta.href}>{result.cta.label}</Link>
                </ToastAction>
              ) : undefined,
            });
          }
        })
        .catch(() => {
          toast({
            variant: "destructive",
            title: "خطا",
            description: DEFAULT_ERROR_MESSAGE,
          });
        });
    });
  };

  return (
    <tr className="border-b">
      <td className="p-4 font-medium">{job.title}</td>
      <td className="p-4">
        <StatusBadge status={job.status} />
      </td>
      <td className="p-4">
        <ModerationBadge status={job.moderation} />
      </td>
      <td className="p-4 text-sm text-muted-foreground">{formattedDate}</td>
      <td className="p-4 text-sm text-muted-foreground">{formattedViews}</td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="link" className="px-0">
            <Link href={`/dashboard/jobs/${job.id}/edit`}>ویرایش</Link>
          </Button>
          {job.status === "DRAFT" ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => handleAction("publish")}
            >
              انتشار (مصرف ۱ اعتبار)
            </Button>
          ) : null}
          {job.status === "PUBLISHED" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => handleAction("close")}
            >
              بستن آگهی
            </Button>
          ) : null}
          {job.status === "CLOSED" ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => handleAction("republish")}
            >
              بازنشر (مصرف ۱ اعتبار)
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

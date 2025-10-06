"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { JobModeration, JobStatus } from "@prisma/client";

import { closeJobAction } from "@/app/(admin)/admin/jobs/actions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

import { FeatureControls } from "./FeatureControls";
import { ModerationControls } from "./ModerationControls";
import { StatusPills } from "./StatusPills";

const ERROR_MESSAGE = "خطایی رخ داد. لطفاً دوباره تلاش کنید.";

export type JobAdminRow = {
  id: string;
  title: string;
  status: JobStatus;
  moderation: JobModeration;
  featuredUntil: string | null;
  createdAt: string;
  owner: {
    id: string;
    name: string | null;
  };
};

type JobsAdminTableProps = {
  jobs: JobAdminRow[];
};

function formatPersianDate(value: string): string {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(value));
}

function formatOwnerName(name: string | null): string {
  const trimmed = name?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "بدون نام";
}

function CloseJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    const confirmed = window.confirm("آیا از بستن آگهی اطمینان دارید؟");
    if (!confirmed) {
      return;
    }

    startTransition(() => {
      closeJobAction(jobId)
        .then((result) => {
          if (result.ok) {
            toast({ title: "آگهی بسته شد." });
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
    <Button
      size="sm"
      variant="outline"
      className="text-destructive"
      disabled={isPending}
      onClick={handleClose}
    >
      بستن آگهی
    </Button>
  );
}

export function JobsAdminTable({ jobs }: JobsAdminTableProps) {
  const rows = useMemo(
    () =>
      jobs.map((job) => ({
        ...job,
        createdAtLabel: formatPersianDate(job.createdAt),
        ownerName: formatOwnerName(job.owner.name),
      })),
    [jobs],
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>عنوان</TableHead>
            <TableHead>مالک</TableHead>
            <TableHead>وضعیت</TableHead>
            <TableHead>تاریخ ایجاد</TableHead>
            <TableHead>عملیات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                آگهی‌ای برای نمایش وجود ندارد.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap font-medium">
                  <Link href={`/jobs/${row.id}`} className="hover:underline">
                    {row.title}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  <div className="flex flex-col">
                    <span>{row.ownerName}</span>
                    <Link
                      href={{
                        pathname: "/admin/users/[userId]",
                        query: { userId: row.owner.id },
                      }}                      className="text-xs text-primary hover:underline"
                    >
                      شناسه: {row.owner.id}
                    </Link>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusPills
                    status={row.status}
                    moderation={row.moderation}
                    featuredUntil={row.featuredUntil}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {row.createdAtLabel}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-3">
                    <ModerationControls jobId={row.id} moderation={row.moderation} />
                    <div className="flex flex-wrap items-center gap-2">
                      <FeatureControls jobId={row.id} featuredUntil={row.featuredUntil} />
                      {row.status !== "CLOSED" ? <CloseJobButton jobId={row.id} /> : null}
                    </div>
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

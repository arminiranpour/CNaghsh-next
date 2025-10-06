import type { JobModeration, JobStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

type StatusPillsProps = {
  status: JobStatus;
  moderation: JobModeration;
  featuredUntil?: string | null;
};

const STATUS_LABELS: Record<JobStatus, string> = {
  DRAFT: "پیش‌نویس",
  PUBLISHED: "منتشرشده",
  CLOSED: "بسته",
};

const STATUS_VARIANT: Record<JobStatus, "outline" | "secondary" | "destructive" | "success"> = {
  DRAFT: "secondary",
  PUBLISHED: "success",
  CLOSED: "destructive",
};

const MODERATION_LABELS: Record<JobModeration, string> = {
  PENDING: "در انتظار",
  APPROVED: "تأیید شده",
  REJECTED: "رد شده",
  SUSPENDED: "معلق",
};

const MODERATION_VARIANT: Record<JobModeration, "secondary" | "success" | "destructive" | "warning"> = {
  PENDING: "secondary",
  APPROVED: "success",
  REJECTED: "destructive",
  SUSPENDED: "warning",
};

function isFeaturedActive(featuredUntil?: string | null): boolean {
  if (!featuredUntil) {
    return false;
  }
  const date = new Date(featuredUntil);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return date.getTime() > Date.now();
}

export function StatusPills({ status, moderation, featuredUntil }: StatusPillsProps) {
  const featuredActive = isFeaturedActive(featuredUntil);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>
      <Badge variant={MODERATION_VARIANT[moderation]}>{MODERATION_LABELS[moderation]}</Badge>
      {featuredActive ? <Badge variant="warning">ویژه</Badge> : null}
    </div>
  );
}

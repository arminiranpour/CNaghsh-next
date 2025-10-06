import type { JobStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const STATUS_MAP: Record<
  JobStatus,
  { label: string; variant: "secondary" | "success" | "outline" }
> = {
  DRAFT: { label: "پیش‌نویس", variant: "secondary" },
  PUBLISHED: { label: "منتشرشده", variant: "success" },
  CLOSED: { label: "بسته", variant: "outline" },
};

type StatusBadgeProps = {
  status: JobStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_MAP[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

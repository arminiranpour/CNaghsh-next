import type { JobModeration } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const MODERATION_MAP: Record<
  JobModeration,
  { label: string; variant: "warning" | "success" | "destructive" | "outline" }
> = {
  PENDING: { label: "در انتظار بررسی", variant: "warning" },
  APPROVED: { label: "تایید شده", variant: "success" },
  REJECTED: { label: "رد شده", variant: "destructive" },
  SUSPENDED: { label: "معلق", variant: "outline" },
};

type ModerationBadgeProps = {
  status: JobModeration;
};

export function ModerationBadge({ status }: ModerationBadgeProps) {
  const config = MODERATION_MAP[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

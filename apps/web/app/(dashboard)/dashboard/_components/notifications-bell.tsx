import Link from "next/link";
import { Bell } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getServerAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function formatCount(count: number): string {
  const capped = count > 99 ? 99 : count;
  return new Intl.NumberFormat("fa-IR").format(capped);
}

export async function NotificationsBell() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return null;
  }

  const unreadCount = await prisma.notification.count({
    where: {
      userId: session.user.id,
      readAt: null,
    },
  });

  return (
    <Button
      asChild
      variant="ghost"
      className="relative flex items-center gap-2 text-sm font-medium text-foreground"
    >
      <Link href="/dashboard/notifications" className="flex items-center gap-2">
        <span className="relative inline-flex h-9 items-center gap-2">
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 ? (
            <Badge
              variant="destructive"
              className="absolute -top-2 -left-3 px-2 py-0 text-[11px] font-bold"
            >
              {formatCount(unreadCount)}
            </Badge>
          ) : null}
        </span>
        <span>مشاهده اعلان‌ها</span>
      </Link>
    </Button>
  );
}

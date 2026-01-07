import type { ReactNode } from "react";
import type { Route } from "next";
import { unstable_noStore as noStore } from "next/cache";

import { Badge } from "@/components/ui/badge";
import { getSubscription } from "@/lib/billing/subscriptionService";
import { formatJalaliDate } from "@/lib/datetime/jalali";
import { getServerAuthSession } from "@/lib/auth/session";

import { DashboardSidebarNav } from "./_components/sidebar-nav";
import { NotificationsBell } from "./_components/notifications-bell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const dashboardNav = [
  { href: "/dashboard/profile" as Route, label: "پروفایل" },
  { href: "/dashboard/jobs" as Route, label: "آگهی‌ها" },
  { href: "/dashboard/courses" as Route, label: "دوره‌ها" },
  { href: "/dashboard/notifications" as Route, label: "اعلان‌ها" },
  { href: "/dashboard/billing" as Route, label: "صورتحساب" },
  { href: "/dashboard/settings" as Route, label: "تنظیمات" },
] satisfies Array<{ href: Route; label: string }>;

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  noStore();

  const session = await getServerAuthSession();
  const subscription = session?.user?.id
    ? await getSubscription(session.user.id)
    : null;

  const activeBadgeLabel = subscription &&
    (subscription.status === "active" || subscription.status === "renewing")
    ? `اشتراک فعال تا ${formatJalaliDate(subscription.endsAt)}`
    : null;

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      <div className="flex min-h-screen flex-row-reverse">
        <aside className="w-full max-w-xs border-l border-border bg-background p-6">
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                مدیریت حساب
              </p>
              <h2 className="text-xl font-semibold">پنل کاربری</h2>
            </div>
            <DashboardSidebarNav items={dashboardNav} />
          </div>
        </aside>
        <main className="flex-1 border-l border-border/60 bg-background">
          <header className="flex flex-col gap-3 border-b border-border bg-background/90 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">داشبورد</h1>
              <p className="text-sm text-muted-foreground">
                از این بخش می‌توانید اطلاعات حساب خود را مدیریت کنید.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {activeBadgeLabel ? (
                <Badge variant="success" className="w-fit">
                  {activeBadgeLabel}
                </Badge>
              ) : null}
              <NotificationsBell />
            </div>
          </header>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

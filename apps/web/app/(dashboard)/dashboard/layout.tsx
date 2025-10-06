import type { ReactNode } from "react";
import type { Route } from "next";

import { DashboardSidebarNav } from "./_components/sidebar-nav";
import { NotificationsBell } from "./_components/notifications-bell";

const dashboardNav = [
  { href: "/dashboard/profile" as Route, label: "پروفایل" },
  { href: "/dashboard/jobs" as Route, label: "آگهی‌ها" },
  { href: "/dashboard/notifications" as Route, label: "اعلان‌ها" },
  { href: "/dashboard/billing" as Route, label: "صورتحساب" },
  { href: "/dashboard/settings" as Route, label: "تنظیمات" },
] satisfies Array<{ href: Route; label: string }>;

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
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
            <div>
              <h1 className="text-2xl font-semibold">داشبورد</h1>
              <p className="text-sm text-muted-foreground">
                از این بخش می‌توانید اطلاعات حساب خود را مدیریت کنید.
              </p>
            </div>
            <NotificationsBell />
          </header>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
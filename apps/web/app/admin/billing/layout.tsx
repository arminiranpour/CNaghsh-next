import type { ReactNode } from "react";

import { SidebarNav } from "./sidebar-nav";

export default function BillingAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div dir="rtl" className="min-h-screen bg-muted/20">
      <div className="flex min-h-screen flex-row-reverse">
        <aside className="w-64 border-l border-border bg-background p-6">
          <div className="space-y-2">
            <div className="text-xl font-semibold">ادمین</div>
            <div className="inline-flex rounded-md bg-amber-200 px-3 py-1 text-xs font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
              Sandbox Admin
            </div>
          </div>
          <SidebarNav className="mt-6" />
        </aside>
        <main className="flex-1">
          <header className="border-b border-border bg-background p-6">
            <h1 className="text-2xl font-semibold">مدیریت صورتحساب</h1>
          </header>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
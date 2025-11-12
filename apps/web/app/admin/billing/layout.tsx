import type { ReactNode } from "react";

import { ADMIN_FORBIDDEN_MESSAGE, requireAdmin } from "@/lib/admin/auth";

import { SidebarNav } from "./sidebar-nav";

export default async function BillingAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (error) {
    return (
      <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-6 text-center">
        <div className="max-w-md space-y-4 rounded-lg border border-border bg-background p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-destructive">دسترسی غیرمجاز</h1>
          <p className="text-sm leading-6 text-muted-foreground">{ADMIN_FORBIDDEN_MESSAGE}</p>
        </div>
      </div>
    );
  }

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
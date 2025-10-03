import type { ReactNode } from "react";
import Link from "next/link";

const dashboardNav = [{ href: "/dashboard/billing", label: "صورتحساب" }];

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div dir="rtl" className="min-h-screen bg-muted/20">
      <div className="flex min-h-screen flex-row-reverse">
        <aside className="w-64 border-l border-border bg-background p-6">
          <div className="text-xl font-semibold">داشبورد</div>
          <nav className="mt-6 space-y-2 text-sm">
            {dashboardNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex rounded-md px-3 py-2 font-medium text-foreground transition hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1">
          <header className="border-b border-border bg-background p-6">
            <h1 className="text-2xl font-semibold">داشبورد</h1>
          </header>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/billing" as Route, label: "نمای کلی" },
  { href: "/admin/billing/subscriptions" as Route, label: "اشتراک‌ها" },
  { href: "/admin/billing/payments" as Route, label: "پرداخت‌ها" },
  { href: "/admin/billing/invoices" as Route, label: "فاکتورها" },
  { href: "/admin/billing/entitlements" as Route, label: "دسترسی‌ها" },
  { href: "/admin/billing/webhooks" as Route, label: "وب‌هوک‌ها" },
  { href: "/admin/billing/exports" as Route, label: "خروجی‌ها" },
  { href: "/admin/billing/activity" as Route, label: "گزارش عملیات" },
  { href: "/admin/billing/products" as Route, label: "محصولات" },
  { href: "/admin/billing/plans" as Route, label: "پلن‌ها" },
  { href: "/admin/billing/prices" as Route, label: "قیمت‌ها" },
] as const;

export function SidebarNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("space-y-2 text-sm", className)}>
      {navItems.map((item) => {
        const isActive = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-between rounded-md px-3 py-2 font-medium transition",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
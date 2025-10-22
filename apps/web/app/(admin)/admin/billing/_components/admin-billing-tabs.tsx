"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/billing", label: "نمای کلی" },
  { href: "/admin/billing/subscriptions", label: "اشتراک‌ها" },
  { href: "/admin/billing/payments", label: "پرداخت‌ها" },
  { href: "/admin/billing/invoices", label: "فاکتورها" },
] as const;

export function AdminBillingTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              buttonVariants({ variant: active ? "default" : "outline", size: "sm" }),
              active ? "pointer-events-none" : undefined,
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

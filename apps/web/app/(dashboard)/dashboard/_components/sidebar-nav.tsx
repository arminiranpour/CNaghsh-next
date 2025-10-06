"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type SidebarItem = {
  href: Route;
  label: string;
};

type SidebarNavProps = {
  items: SidebarItem[];
};

export function DashboardSidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 text-sm font-medium">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-between rounded-md px-3 py-2 transition",
              isActive
                ? "bg-primary/10 text-primary hover:bg-primary/20"
                : "text-foreground hover:bg-muted"
            )}
          >
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

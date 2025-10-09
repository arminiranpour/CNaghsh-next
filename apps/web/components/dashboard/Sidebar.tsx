"use client"

import Link from "next/link"

const items = [
  { href: "/dashboard", label: "داشبورد" },
  { href: "/dashboard/profile", label: "پروفایل" },
  { href: "/dashboard/jobs", label: "فرصت‌ها" },
  { href: "/dashboard/billing", label: "صورتحساب" }
]

export default function Sidebar() {
  return (
    <aside className="border-e min-h-full p-3 lg:p-4">
      <nav className="flex flex-col gap-1">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="rounded-lg px-3 py-2 hover:bg-muted">
            {it.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}

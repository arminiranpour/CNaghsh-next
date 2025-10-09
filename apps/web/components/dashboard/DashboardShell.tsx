"use client"

import * as React from "react"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"

export default function DashboardShell({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100dvh-64px)] grid lg:grid-cols-[280px_1fr]">
      <div className="hidden lg:block lg:sticky lg:top-0 lg:self-start">
        <Sidebar />
      </div>
      <div className="flex flex-col">
        <Topbar title={title} />
        <main className="p-3 lg:p-4">{children}</main>
      </div>
    </div>
  )
}

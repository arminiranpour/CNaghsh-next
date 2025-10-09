"use client"

export default function Topbar({ title = "داشبورد" }: { title?: string }) {
  return (
    <div className="h-14 border-b flex items-center justify-between px-3 lg:px-4">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        <input className="h-9 rounded-lg border px-3 text-sm" placeholder="جستجو…" />
      </div>
    </div>
  )
}

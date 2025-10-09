"use client"

import Container from "@/components/layout/Container"
import { Button } from "@/components/ui/button"

export default function Hero() {
  return (
    <header className="bg-background border-b">
      <Container className="grid gap-6 lg:grid-cols-2 py-12">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">پلتفرم بازیگران و فرصت‌های شغلی</h1>
          <p className="text-muted-foreground">پروفایل خود را منتشر کنید یا بین فرصت‌های تایید شده جستجو کنید.</p>
          <div className="flex gap-3">
            <Button asChild>
              <a href="/profiles/new">ثبت پروفایل</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/jobs">مشاهده فرصت‌ها</a>
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border h-[260px] lg:h-auto" />
      </Container>
    </header>
  )
}

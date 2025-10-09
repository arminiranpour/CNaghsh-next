import Link from "next/link";

import Container from "@/components/layout/Container";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <header className="border-b bg-background">
      <Container className="grid gap-6 py-12 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            پلتفرم بازیگران و فرصت‌های شغلی
          </h1>
          <p className="text-muted-foreground">
            پروفایل خود را منتشر کنید یا بین فرصت‌های تایید شده جستجو کنید.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/profiles/new">ثبت پروفایل</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/jobs">مشاهده فرصت‌ها</Link>
            </Button>
          </div>
        </div>
        <div className="h-[260px] rounded-2xl border lg:h-auto" />
      </Container>
    </header>
  );
}

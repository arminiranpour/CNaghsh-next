import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="container flex flex-col items-center gap-8 py-24 text-center">
        <span className="rounded-full border border-primary/40 bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
          بازارگاه استعدادهای نمایشی
        </span>
        <h1 className="max-w-3xl text-balance text-4xl font-bold leading-relaxed sm:text-5xl">
          کشف استعدادها و مدیریت فراخوان‌ها در یک پلتفرم سریع و مدرن
        </h1>
        <p className="max-w-2xl text-balance text-muted-foreground">
          این نسخه‌ی اولیه تنها اسکلت‌بندی صفحات عمومی است تا در اسپرینت‌های بعدی بتوانیم عملکردها و جریان‌های اصلی محصول را پیاده‌سازی کنیم.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/talent/123">ثبت‌نام استعداد</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/castings">ثبت‌نام کارفرما</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
import Link from "next/link";

import Hero from "@/components/blocks/home/Hero";
import FeaturedStrip from "@/components/blocks/home/FeaturedStrip";
import HowItWorks from "@/components/blocks/home/HowItWorks";
import StatsBand from "@/components/blocks/home/StatsBand";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedStrip />
      <HowItWorks />
      <StatsBand />
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container flex flex-col items-center gap-8 py-24 text-center">
          <span className="rounded-full border border-primary/40 bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            بازارگاه استعدادهای نمایشی
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-bold leading-relaxed sm:text-5xl">
            کشف فرصت‌ها و مدیریت پروفایل حرفه‌ای در یک پلتفرم سریع و مدرن
          </h1>
          <p className="max-w-2xl text-balance text-muted-foreground">
            این نسخه‌ی اولیه تنها اسکلت‌بندی صفحات عمومی است تا در اسپرینت‌های بعدی بتوانیم عملکردها و جریان‌های اصلی محصول را پیاده‌سازی کنیم.
            همه کاربران با یک حساب می‌توانند هم رزومه ارسال کنند و هم فراخوان منتشر نمایند.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/users/123">شروع کاربری</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const stats = [
  { label: "پروفایل‌های فعال", value: "+180" },
  { label: "فراخوان‌های باز", value: "64" },
  { label: "میانگین پاسخ", value: "48 ساعت" },
];

const features = [
  {
    title: "پروفایل ویدئویی پایدار",
    description: "ویدیوهای HLS با پوستر ثابت و کش CDN نمایش داده می‌شوند تا اولین تجربه‌ی بازدید بدون لگ باشد.",
  },
  {
    title: "استخدام شفاف",
    description: "آگهی‌ها با اطلاعات پرداخت، شهر، و مهلت انتشار رندر سمت سرور می‌شوند تا قبل از تعامل اولیه قابل مشاهده باشند.",
  },
  {
    title: "مدیریت دسترسی",
    description: "صفحات عمومی طی ۵ دقیقه دوباره رندر می‌شوند و هم‌زمان قوانین کش لایه لبه کنترل تغییرات را تضمین می‌کند.",
  },
];

const workflow = [
  "پروفایل خود را با ویدئو و مهارت‌های اصلی تکمیل کنید.",
  "در صفحه‌ی فرصت‌ها فیلترها را اعمال و اولین آگهی‌های پیشنهادی را ببینید.",
  "با کارفرما ارتباط بگیرید یا آگهی جدید ثبت کنید.",
];

export default function HomePage() {
  return (
    <div className="space-y-24 pb-16">
      <section className="bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="container grid items-center gap-12 py-20 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-8 text-center lg:text-right">
            <div className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary/5 px-5 py-1 text-sm font-medium text-primary lg:justify-end">
              بازارگاه فراخوان‌ها و رزومه‌های ویدئویی
            </div>
            <div className="space-y-5">
              <h1 className="text-balance text-4xl font-bold leading-tight sm:text-5xl">
                سرعت و ثبات تجربه‌ی صفحه اول دقیقا همان چیزی است که کاربران اجتماعی انتظار دارند.
              </h1>
              <p className="text-lg text-muted-foreground">
                صفحات خانه، پروفایل، و آگهی‌ها کاملا سمت سرور رندر می‌شوند، تصاویر LCP با <code className="rounded bg-muted px-2 py-0.5">next/image</code> بارگذاری می‌شوند و
                اسکریپت‌های غیر ضروری تا بعد از اولین تعامل تعویق دارند.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <Button asChild size="lg">
                <Link href="/jobs">مشاهده فرصت‌ها</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/profiles">پروفایل‌های عمومی</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border/80 bg-card/50 px-4 py-6 text-right shadow-sm">
                  <p className="text-3xl font-semibold tracking-tight">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xl">
              <Image
                src="/hero-grid.svg"
                alt="گرید پیش‌نمایش پروفایل‌های ویدئویی"
                fill
                sizes="(min-width: 1024px) 420px, 80vw"
                priority
                className="object-cover"
              />
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/10 bg-black/70 px-5 py-4 text-sm text-white backdrop-blur">
                <p className="text-base font-semibold">نمونه معرفی بازیگر</p>
                <p className="text-xs text-white/70">LCP با پوستر ۲۵۶۰px و کش ۱ ساعته</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container space-y-10">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold text-primary">عملکرد پایدار</p>
          <h2 className="text-3xl font-bold">ساخته شده برای حفظ Core Web Vitals</h2>
          <p className="text-muted-foreground">
            همه‌ی ماژول‌های سنگین (ویدیو، ایمیل، و بخش‌های تعاملی) با dynamic import و IntersectionObserver راه‌اندازی می‌شوند تا صفحه‌ی اولیه سبک بماند.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-border/70 bg-card/40 p-6 text-right shadow-sm">
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container grid gap-10 lg:grid-cols-2">
        <div className="rounded-3xl border border-border/80 bg-card/60 p-8 text-right shadow-sm">
          <p className="text-sm font-semibold text-primary">مسیر انجام کار</p>
          <h2 className="mt-3 text-2xl font-bold">یک جریان ساده برای کاربران جدید</h2>
          <p className="mt-4 text-sm text-muted-foreground">
            رابط اصلی بدون جاوااسکریپت اضافی رندر می‌شود تا محتوای کلیدی همیشه قابل دسترس باشد، حتی قبل از تکمیل hydration.
          </p>
          <ol className="mt-8 space-y-4 text-sm leading-7 text-muted-foreground">
            {workflow.map((item, index) => (
              <li key={item} className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col justify-between gap-6 rounded-3xl border border-border/80 bg-muted/40 p-8 text-right shadow-inner">
          <div>
            <h3 className="text-xl font-semibold">برای توسعه‌دهندگان</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              بودجه‌های LCP، CLS، و INP در <code className="rounded bg-background px-2 py-0.5">config/core-web-vitals.budgets.ts</code> تعریف شده‌اند و هر اجرای Lighthouse با
              <code className="mx-1 rounded bg-background px-2 py-0.5">pnpm cwv:smoke</code> در برابر آن‌ها بررسی می‌شود.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/auth/signup">ساخت حساب کاربری</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

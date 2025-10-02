import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface UserPageProps {
  params: {
    id: string;
  };
}

export function generateMetadata({ params }: UserPageProps): Metadata {
  return {
    title: `پروفایل کاربر ${params.id}`
  };
}

export default function UserPage({ params }: UserPageProps) {
  return (
    <section className="container space-y-8 py-16">
      <Card>
        <CardHeader className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {params.id.substring(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <CardTitle>نام کاربر</CardTitle>
              <CardDescription>یک حساب برای مدیریت رزومه و فراخوان‌های شغلی</CardDescription>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            شناسه کاربری: <span className="font-medium text-foreground">{params.id}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">درباره کاربر</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              این بخش نمونه‌ای برای معرفی کاربر است. در مراحل بعدی اطلاعات کامل شامل سوابق، مهارت‌ها و رسانه‌ها برای رزومه و فراخوان‌ها نمایش داده خواهد شد.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">فعالیت‌های اخیر</h2>
            <p className="text-sm text-muted-foreground">
              هنوز هیچ رزومه یا فراخوانی ثبت نشده است. لطفاً پس از پیاده‌سازی فرم‌ها، فعالیت‌های کاربر در اینجا نمایش داده می‌شوند.
            </p>
          </section>
        </CardContent>
      </Card>
    </section>
  );
}
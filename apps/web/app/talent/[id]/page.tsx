import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TalentPageProps {
  params: {
    id: string;
  };
}

export function generateMetadata({ params }: TalentPageProps): Metadata {
  return {
    title: `پروفایل استعداد ${params.id}`
  };
}

export default function TalentPage({ params }: TalentPageProps) {
  return (
    <section className="container space-y-8 py-16">
      <Card>
        <CardHeader className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {params.id.substring(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <CardTitle>نام استعداد</CardTitle>
              <CardDescription>شهر محل زندگی • مهارت‌ها به زودی</CardDescription>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            شناسه کاربری: <span className="font-medium text-foreground">{params.id}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">درباره استعداد</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              این بخش به صورت نمونه متن برای معرفی استعداد است. در مراحل بعدی اطلاعات کامل شامل سوابق، مهارت‌ها و رسانه‌ها نمایش داده خواهد شد.
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">مهارت‌های برجسته</h2>
            <p className="text-sm text-muted-foreground">
              هنوز مهارتی ثبت نشده است. لطفاً بعد از پیاده‌سازی فرم‌ها، مهارت‌ها در اینجا نمایش داده می‌شوند.
            </p>
          </section>
        </CardContent>
      </Card>
    </section>
  );
}
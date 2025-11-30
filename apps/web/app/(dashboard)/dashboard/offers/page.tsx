import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerAuthSession } from "@/lib/auth/session";

export default async function OffersPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/auth?tab=signin");
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">پیشنهادها</h1>
        <p className="text-sm text-muted-foreground">
          پیشنهادهای همکاری دریافت‌شده در این بخش نمایش داده خواهد شد.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>پیشنهادها (در حال توسعه)</CardTitle>
          <CardDescription>در فاز بعدی پیشنهادهای ارسالی کارفرماها اینجا فهرست می‌شود.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              فعلاً محتوایی برای نمایش وجود ندارد. برای آماده‌سازی حساب می‌توانید پروفایل خود را کامل کنید.
            </p>
            <Button asChild variant="secondary">
              <Link href="/dashboard/profile">ویرایش پروفایل</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

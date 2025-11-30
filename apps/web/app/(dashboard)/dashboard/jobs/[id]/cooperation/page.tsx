import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type JobCooperationPageProps = {
  params: { id: string };
};

export default async function JobCooperationPage({ params }: JobCooperationPageProps) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/auth?tab=signin");
  }

  const job = await prisma.job.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!job) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">آگهی: {job.title}</p>
          <h1 className="text-2xl font-semibold">همکاری‌ها</h1>
          <p className="text-sm text-muted-foreground">
            اینجا محل نمایش و مدیریت پیشنهادهای همکاری اختصاص داده‌شده به آگهی شما خواهد بود.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/jobs">بازگشت به لیست آگهی‌ها</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href={`/dashboard/jobs/${job.id}/edit`}>ویرایش آگهی</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>بخش همکاری (در حال توسعه)</CardTitle>
          <CardDescription>در فاز بعدی بازیگران اختصاص‌یافته و پیام‌های همکاری در این بخش قرار می‌گیرند.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            برای آماده‌سازی، آگهی‌های در حال انتشار و متقاضیان مرتبط را در دسترس نگه دارید. به محض آماده شدن
            قابلیت‌های همکاری، وضعیت و تاریخچه اینجا نمایش داده می‌شود.
          </p>
          <Button asChild variant="secondary">
            <Link href={`/jobs/${job.id}`} target="_blank" rel="noreferrer">
              مشاهده آگهی منتشرشده
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

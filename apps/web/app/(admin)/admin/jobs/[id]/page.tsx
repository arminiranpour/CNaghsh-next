import Link from "next/link";
import { notFound } from "next/navigation";

import { closeJobAction } from "@/app/(admin)/admin/jobs/actions";
import { FeatureControls } from "@/components/admin/jobs/FeatureControls";
import { ModerationControls } from "@/components/admin/jobs/ModerationControls";
import { StatusPills } from "@/components/admin/jobs/StatusPills";
import { Button } from "@/components/ui/button";
import { getServerAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

async function getJob(id: string) {
  return prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      moderation: true,
      featuredUntil: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export default async function AdminJobDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerAuthSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  const job = await getJob(params.id);

  if (!job) {
    notFound();
  }

  const jobId = job.id;

  const featuredLabel = job.featuredUntil ? formatDate(job.featuredUntil) : "ویژه نیست";
  const createdLabel = formatDate(job.createdAt);
  const updatedLabel = formatDate(job.updatedAt);
  const ownerName = job.user.name?.trim()?.length ? job.user.name : "بدون نام";

  async function closeJob() {
    "use server";
    await closeJobAction(jobId);
  }

  return (
    <div className="space-y-6" dir="rtl">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">مدیریت آگهی: {job.title}</h1>
        <p className="text-sm text-muted-foreground">
          در این صفحه می‌توانید وضعیت آگهی را تغییر دهید و اطلاعات تکمیلی را مشاهده کنید.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-border bg-background p-4 shadow-sm">
          <div className="space-y-2 text-sm text-muted-foreground">
            <h2 className="text-lg font-semibold text-foreground">اطلاعات آگهی</h2>
            <p>شناسه: {job.id}</p>
            <p>مالک: {ownerName}</p>
            <p>شناسه مالک: {job.user.id}</p>
            <p>ساخته شده در: {createdLabel}</p>
            <p>آخرین بروزرسانی: {updatedLabel}</p>
            <p>ویژه تا: {featuredLabel}</p>
          </div>

          <StatusPills
            status={job.status}
            moderation={job.moderation}
            featuredUntil={job.featuredUntil ? job.featuredUntil.toISOString() : null}
          />

          <div className="flex flex-col gap-4">
            <ModerationControls jobId={jobId} moderation={job.moderation} />
            <div className="flex flex-wrap items-center gap-3">
              <FeatureControls jobId={jobId} featuredUntil={job.featuredUntil?.toISOString() ?? null} />
              {job.status !== "CLOSED" ? (
                <form action={closeJob}>
                  <Button variant="outline" className="text-destructive">
                    بستن آگهی
                  </Button>
                </form>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-primary">
            <Link href={`/jobs/${jobId}`} className="hover:underline">
              مشاهده در سایت
            </Link>
            <Link href={`/dashboard/jobs/${jobId}/edit`} className="hover:underline">
              صفحه ویرایش مالک
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
          <h2 className="text-lg font-semibold">توضیحات آگهی</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
            {job.description}
          </p>
        </div>
      </section>
    </div>
  );
}

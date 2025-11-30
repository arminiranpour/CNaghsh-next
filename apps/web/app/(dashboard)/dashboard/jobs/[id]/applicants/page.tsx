import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ApplicationStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isAdminUser } from "@/lib/auth/admin";
import { getServerAuthSession } from "@/lib/auth/session";
import { formatJalaliDate } from "@/lib/datetime/jalali";
import { prisma } from "@/lib/prisma";

type ApplicantsPageProps = {
  params: { id: string };
};

function buildApplicantName(params: {
  stageName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fallback?: string | null;
}) {
  const { stageName, firstName, lastName, fallback } = params;
  if (stageName && stageName.trim()) {
    return stageName.trim();
  }
  const combined = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  if (combined) {
    return combined;
  }
  return fallback ?? "بدون نام";
}

function statusLabel(status: ApplicationStatus): string {
  switch (status) {
    case ApplicationStatus.new:
      return "جدید";
    case ApplicationStatus.shortlist:
      return "لیست کوتاه";
    case ApplicationStatus.select:
      return "انتخاب شده";
    case ApplicationStatus.reject:
      return "رد شده";
    case ApplicationStatus.withdrawn:
      return "انصراف";
    default:
      return "نامشخص";
  }
}

export default async function ApplicantsPage({ params }: ApplicantsPageProps) {
  const session = await getServerAuthSession();

  const sessionUser = session?.user;

  if (!sessionUser?.id) {
    redirect("/auth?tab=signin");
  }

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: { id: true, title: true, userId: true },
  });

  if (!job) {
    notFound();
  }

  const isOwner = job.userId === sessionUser.id;
  const isAdmin = isAdminUser(sessionUser);

  if (!isOwner && !isAdmin) {
    notFound();
  }

  const applications = await prisma.application.findMany({
    where: { jobId: job.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      applicantUserId: true,
      applicant: {
        select: {
          name: true,
          profile: {
            select: {
              id: true,
              stageName: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  const canSendOffers = (isOwner || isAdmin) ?? false;

  return (
    <div className="mx-auto max-w-4xl space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">آگهی: {job.title}</p>
          <h1 className="text-2xl font-semibold">متقاضیان</h1>
          <p className="text-sm text-muted-foreground">
            فهرست متقاضیان این آگهی پس از اتصال به سامانه درخواست‌ها در اینجا نمایش داده خواهد شد.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/jobs">بازگشت به لیست آگهی‌ها</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href={`/dashboard/jobs/${job.id}/edit`}>ویرایش آگهی</Link>
          </Button>
          <Button variant="outline" asChild>
            <a
              href={`/debug/job-purchase?jobId=${job.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              مشاهده تستی خرید آگهی
            </a>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>مدیریت متقاضیان</CardTitle>
          <CardDescription>
            برای هر متقاضی می‌توانید پروفایل را ببینید و مستقیماً «ارسال پیشنهاد همکاری» را شروع کنید.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {applications.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              هنوز درخواستی برای این آگهی ثبت نشده است. به محض دریافت درخواست، دکمه «ارسال پیشنهاد
              همکاری» کنار هر متقاضی نمایش داده می‌شود.
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">نام متقاضی</TableHead>
                    <TableHead>وضعیت درخواست</TableHead>
                    <TableHead>تاریخ ثبت</TableHead>
                    <TableHead className="text-left">اقدامات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((application) => {
                    const profile = application.applicant.profile;
                    const applicantName = buildApplicantName({
                      stageName: profile?.stageName,
                      firstName: profile?.firstName,
                      lastName: profile?.lastName,
                      fallback: application.applicant.name,
                    });
                    const profileHref = profile ? `/profiles/${profile.id}` : null;

                    return (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <span>{applicantName}</span>
                            {profileHref ? (
                              <Link
                                href={profileHref}
                                className="text-xs text-primary underline underline-offset-4"
                                target="_blank"
                                rel="noreferrer"
                              >
                                مشاهده پروفایل
                              </Link>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{statusLabel(application.status)}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatJalaliDate(application.createdAt)}
                        </TableCell>
                        <TableCell className="text-left">
                          {canSendOffers && sessionUser.id !== application.applicantUserId ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              asChild
                            >
                              <Link
                                href={`/dashboard/cooperation/new?jobId=${job.id}&receiverId=${application.applicantUserId}&applicationId=${application.id}`}
                              >
                                ارسال پیشنهاد همکاری
                              </Link>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">اجازه اقدام ندارید</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="secondary">
              <Link href={`/jobs/${job.id}`} target="_blank" rel="noreferrer">
                مشاهده صفحه عمومی آگهی
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/dashboard/jobs/${job.id}/cooperation`}>بخش همکاری آگهی</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

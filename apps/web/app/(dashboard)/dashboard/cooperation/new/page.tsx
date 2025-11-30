import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  canCreateCooperationOffer,
  type CreateOfferBlockReason,
} from "@/lib/cooperation/offers/guards";
import { getServerAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type ComposeSearchParams = {
  jobId?: string;
  receiverId?: string;
  roleId?: string;
  applicationId?: string;
};

type ErrorInfo = { title: string; description: string };

function buildDisplayName(
  stageName?: string | null,
  firstName?: string | null,
  lastName?: string | null,
): string {
  if (stageName && stageName.trim()) {
    return stageName.trim();
  }
  const combined = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return combined || "بازیگر بدون نام";
}

function mapError(reason: CreateOfferBlockReason | "MISSING_PARAMS"): ErrorInfo {
  switch (reason) {
    case "UNAUTHENTICATED":
      return { title: "ورود لازم است", description: "برای ارسال پیشنهاد همکاری ابتدا وارد حساب شوید." };
    case "JOB_NOT_FOUND":
      return { title: "آگهی پیدا نشد", description: "شناسه آگهی معتبر نیست یا حذف شده است." };
    case "NOT_JOB_OWNER":
      return {
        title: "دسترسی محدود",
        description: "شما مالک این آگهی نیستید و اجازه ارسال پیشنهاد برای آن را ندارید.",
      };
    case "JOB_STATUS_INVALID":
      return {
        title: "آگهی غیر فعال",
        description: "آگهی در وضعیتی نیست که امکان ارسال پیشنهاد همکاری وجود داشته باشد.",
      };
    case "SELF_OFFER_NOT_ALLOWED":
      return { title: "محدودیت ارسال", description: "ارسال پیشنهاد به حساب کاربری خودتان مجاز نیست." };
    case "RECEIVER_NOT_FOUND":
      return { title: "کاربر پیدا نشد", description: "شناسه بازیگر یا دریافت‌کننده معتبر نیست." };
    case "RECEIVER_PROFILE_MISSING":
      return { title: "پروفایل ناقص", description: "پروفایل بازیگر تکمیل نشده است." };
    case "RECEIVER_PROFILE_NOT_PUBLISHED":
      return {
        title: "پروفایل منتشر نشده",
        description: "این پروفایل هنوز منتشر نشده و امکان ارسال پیشنهاد برای آن وجود ندارد.",
      };
    case "MISSING_PARAMS":
      return {
        title: "اطلاعات ناقص",
        description: "شناسه آگهی و بازیگر برای شروع ارسال پیشنهاد الزامی است.",
      };
    default:
      return { title: "خطا", description: "خطای نامشخصی رخ داده است. لطفاً دوباره تلاش کنید." };
  }
}

export default async function ComposeCooperationOfferPage({
  searchParams,
}: {
  searchParams?: ComposeSearchParams;
}) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/auth?tab=signin");
  }

  const jobId = searchParams?.jobId?.trim();
  const receiverId = searchParams?.receiverId?.trim();
  const roleId = searchParams?.roleId?.trim() || null;
  const applicationId = searchParams?.applicationId?.trim() || null;

  if (!jobId || !receiverId) {
    const error = mapError("MISSING_PARAMS");
    return (
      <div className="mx-auto max-w-3xl space-y-4" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>{error.title}</CardTitle>
            <CardDescription>{error.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href="/dashboard/jobs">بازگشت به آگهی‌ها</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/profiles">مشاهده پروفایل‌ها</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const guardResult = await canCreateCooperationOffer({
    sender: {
      id: session.user.id,
      role: session.user.role,
      email: session.user.email,
    },
    jobId,
    receiverUserId: receiverId,
    roleId,
  });

  if (!guardResult.ok) {
    const error = mapError(guardResult.reason);
    return (
      <div className="mx-auto max-w-3xl space-y-4" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>{error.title}</CardTitle>
            <CardDescription>{error.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href="/dashboard/jobs">بازگشت به آگهی‌ها</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/profiles/${receiverId}`} target="_blank" rel="noreferrer">
                پروفایل بازیگر
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [job, receiver] = await Promise.all([
    prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, title: true },
    }),
    prisma.user.findUnique({
      where: { id: receiverId },
      select: {
        id: true,
        profile: {
          select: { id: true, stageName: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    }),
  ]);

  if (!job || !receiver?.profile) {
    const error = mapError("RECEIVER_NOT_FOUND");
    return (
      <div className="mx-auto max-w-3xl space-y-4" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>{error.title}</CardTitle>
            <CardDescription>{error.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/dashboard/jobs">بازگشت به آگهی‌ها</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const actorName = buildDisplayName(
    receiver.profile.stageName,
    receiver.profile.firstName,
    receiver.profile.lastName,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6" dir="rtl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">ارسال پیشنهاد همکاری</h1>
        <p className="text-sm text-muted-foreground">
          شناسه‌های آگهی و دریافت‌کننده از صفحه قبلی به این بخش منتقل شده‌اند. در فاز بعدی فرم کامل
          تکمیل و ارسال می‌شود.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>اطلاعات پیش‌فرض</CardTitle>
          <CardDescription>این داده‌ها برای فرم ارسال پیشنهاد از پیش پر می‌شوند.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 rounded-md border p-3">
            <p className="text-sm text-muted-foreground">بازیگر / دریافت‌کننده</p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold">{actorName}</p>
                <p className="text-xs text-muted-foreground">شناسه کاربر: {receiver.id}</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={`/profiles/${receiver.profile.id}`} target="_blank" rel="noreferrer">
                  مشاهده پروفایل
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-md border p-3">
            <p className="text-sm text-muted-foreground">آگهی مرتبط</p>
            <p className="text-base font-semibold">{job.title}</p>
            <p className="text-xs text-muted-foreground">شناسه آگهی: {job.id}</p>
          </div>

          <div className="flex flex-col gap-2 rounded-md border p-3">
            <p className="text-sm text-muted-foreground">نقش انتخاب‌شده (اختیاری)</p>
            <p className="text-sm text-muted-foreground">
              {roleId
                ? `شناسه نقش: ${roleId}`
                : "نقشی انتخاب نشده است؛ می‌توانید بدون نقش مشخص شده ادامه دهید."}
            </p>
          </div>

          {applicationId ? (
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              این دعوت از طریق درخواست شماره {applicationId} آغاز شده است.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>فرم پیشنهاد همکاری (در حال توسعه)</CardTitle>
          <CardDescription>
            در فاز بعدی امکان نوشتن پیام، تعیین مهلت و ثبت پیشنهاد فراهم می‌شود.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            محتوای فرم ارسال پیشنهاد در فاز بعدی پیاده‌سازی می‌شود. فعلاً این صفحه فقط مسیر ناوبری و
            پیش‌فرض‌های لازم را آماده می‌کند.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="secondary">
              <Link href={`/dashboard/jobs/${job.id}/applicants`}>بازگشت به متقاضیان</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/jobs">بازگشت به لیست آگهی‌ها</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

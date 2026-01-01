import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeSemesterPricing } from "@/lib/courses/pricing";
import { formatCourseDuration, formatIrr } from "@/lib/courses/format";
import { fetchPublicCourseById } from "@/lib/courses/public/queries";
import { formatJalaliDate } from "@/lib/datetime/jalali";
import { getPublicMediaUrlFromKey } from "@/lib/media/urls";

const semesterStatusLabels = {
  open: "باز",
  closed: "بسته",
} as const;

export default async function CourseDetailPage({
  params,
}: {
  params: { courseId: string };
}) {
  const course = await fetchPublicCourseById(params.courseId);

  if (!course) {
    notFound();
  }

  const bannerUrl =
    course.bannerMediaAsset?.outputKey && course.bannerMediaAsset.visibility === "public"
      ? getPublicMediaUrlFromKey(course.bannerMediaAsset.outputKey)
      : null;

  const introVideoUrl =
    course.introVideoMediaAsset?.outputKey && course.introVideoMediaAsset.visibility === "public"
      ? getPublicMediaUrlFromKey(course.introVideoMediaAsset.outputKey)
      : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10" dir="rtl">
      <header className="space-y-4">
        {bannerUrl ? (
          <div className="aspect-[16/6] w-full overflow-hidden rounded-lg bg-muted">
            <img src={bannerUrl} alt={course.title} className="h-full w-full object-cover" />
          </div>
        ) : null}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{course.title}</h1>
          <p className="text-sm text-muted-foreground">
            {formatCourseDuration(course.durationValue, course.durationUnit)}
          </p>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>اطلاعات دوره</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>مدرس: {course.instructorName}</p>
            <p>محدوده سنی: {course.ageRangeText}</p>
            <p>پیش‌نیاز: {course.prerequisiteText || "ندارد"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ویدیو معرفی</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {introVideoUrl ? (
              <a
                href={introVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                مشاهده لینک ویدیو
              </a>
            ) : (
              <p className="text-muted-foreground">ویدیویی ثبت نشده است.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">توضیحات دوره</h2>
        <p className="text-sm leading-7 text-muted-foreground whitespace-pre-line">
          {course.description}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">ترم‌ها</h2>
        {course.semesters.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              ترمی برای این دوره منتشر نشده است.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {course.semesters.map((semester) => {
              const pricing = computeSemesterPricing(semester);
              const statusLabel = semesterStatusLabels[semester.status as "open" | "closed"] ?? semester.status;
              const installmentLabel = pricing.installments
                ? `پرداخت اقساطی: ${pricing.installments.count} قسط`
                : "پرداخت اقساطی ندارد";
              const discountLabel =
                pricing.lumpSum.discount > 0
                  ? `تخفیف پرداخت یکجا: ${formatIrr(pricing.lumpSum.discount)}`
                  : "تخفیف پرداخت یکجا ندارد";

              return (
                <Link
                  key={semester.id}
                  href={`/courses/${course.id}/semesters/${semester.id}`}
                  className="block"
                >
                  <Card>
                    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle className="text-lg">{semester.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {formatJalaliDate(semester.startsAt)} تا{" "}
                          {formatJalaliDate(semester.endsAt)}
                        </p>
                      </div>
                      <Badge variant={semester.status === "open" ? "success" : "secondary"}>
                        {statusLabel}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p>شهریه: {formatIrr(pricing.lumpSum.base)}</p>
                      <p>پرداخت یکجا: {formatIrr(pricing.lumpSum.total)}</p>
                      <p>{discountLabel}</p>
                      <p>{installmentLabel}</p>
                      <span className="text-primary underline-offset-4 hover:underline">
                        مشاهده جزئیات ترم
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

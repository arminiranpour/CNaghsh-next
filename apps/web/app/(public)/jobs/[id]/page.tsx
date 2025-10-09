import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCities } from "@/lib/location/cities";
import { getPublicJobById } from "@/lib/jobs/publicQueries";
import { buildJobDetailMetadata, getJobOrganizationName } from "@/lib/jobs/seo";
import { incrementJobViews } from "@/lib/jobs/views";
import { SITE_LOCALE, SITE_NAME } from "@/lib/seo/constants";
import { getBaseUrl } from "@/lib/seo/baseUrl";
import { breadcrumbsJsonLd, jobPostingJsonLd } from "@/lib/seo/jsonld";

export const revalidate = 300;

function coerceDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function formatPersianDate(value: unknown): string | null {
  const date = coerceDate(value);

  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
  }).format(date);
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("fa-IR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    const fallback = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(amount);
    return `${fallback} ${currency}`;
  }
}

function formatPayDetails(job: Awaited<ReturnType<typeof getPublicJobById>>): string | null {
  if (!job) {
    return null;
  }

  const parts: string[] = [];

  if (job.payType) {
    parts.push(job.payType);
  }

  if (job.payAmount !== null && job.payAmount !== undefined && job.currency) {
    parts.push(formatCurrency(job.payAmount, job.currency));
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(" | ");
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const job = await getPublicJobById(params.id);

  if (!job) {
    return {
      title: "آگهی یافت نشد",
    };
  }

  const cities = await getCities();
  const cityMap = new Map(cities.map((city) => [city.id, city.name] as const));
  const cityName = job.cityId ? cityMap.get(job.cityId) : undefined;

  const baseMetadata = buildJobDetailMetadata(job, { cityName });
  const canonical = `${getBaseUrl()}/jobs/${job.id}`;
  const title = baseMetadata.title ?? `${job.title} | ${SITE_NAME}`;
  const description = baseMetadata.description;

  return {
    ...baseMetadata,
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const job = await getPublicJobById(params.id);

  if (!job) {
    notFound();
  }

  if (job.status !== "PUBLISHED" || job.moderation !== "APPROVED") {
    notFound();
  }

  const [cities] = await Promise.all([getCities()]);

  const cityMap = new Map(cities.map((city) => [city.id, city.name] as const));
  const cityName = job.cityId ? cityMap.get(job.cityId) ?? job.cityId : undefined;

  incrementJobViews(job.id).catch(() => {});

  const organizationName = getJobOrganizationName(job);
  const payDetails = formatPayDetails(job);
  const isFeatured = job.featuredUntil ? job.featuredUntil > new Date() : false;
  const baseUrl = getBaseUrl();
  const canonical = `${baseUrl}/jobs/${job.id}`;
  const breadcrumbs = breadcrumbsJsonLd([
    { name: "خانه", item: `${baseUrl}/` },
    { name: "فرصت‌های شغلی", item: `${baseUrl}/jobs` },
    { name: job.title, item: canonical },
  ]);
  const jobJsonLd = jobPostingJsonLd({
    id: job.id,
    title: job.title,
    description: job.description,
    url: canonical,
    organizationName,
    remote: job.remote,
    cityName,
    applicantRegionName: cityName ?? "Iran",
    datePosted: job.createdAt,
    validThrough: job.featuredUntil ?? undefined,
    baseSalary:
      job.payAmount !== null && job.payAmount !== undefined && job.currency
        ? {
            currency: job.currency,
            value: job.payAmount,
          }
        : undefined,
  });
  const postedAt = formatPersianDate(job.createdAt) ?? "—";

  const profileLink = job.user.profile
    ? { pathname: "/profiles/[id]", query: { id: job.user.profile.id } }
    : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 pb-12" dir="rtl">
      <JsonLd data={[breadcrumbs, jobJsonLd]} />

      <Card className="border border-border shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-foreground">{job.title}</CardTitle>
              <CardDescription className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>دسته‌بندی: {job.category}</span>
                {cityName ? <span>شهر: {cityName}</span> : null}
                <span>تاریخ انتشار: {postedAt}</span>
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isFeatured ? <Badge variant="warning">ویژه</Badge> : null}
              {job.remote ? <Badge variant="outline">دورکاری</Badge> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>کارفرما: {organizationName}</span>
            {payDetails ? <span>شرایط پرداخت: {payDetails}</span> : null}
            {profileLink ? (
              <Link href={profileLink} className="text-primary underline">
                مشاهده پروفایل کارفرما
              </Link>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">توضیحات آگهی</h2>
          <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">{job.description}</p>
        </CardContent>
      </Card>

      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle>درخواست همکاری</CardTitle>
          <CardDescription>
            سامانه درخواست آنلاین به زودی فعال می‌شود. در حال حاضر می‌توانید با کارفرما به صورت مستقیم هماهنگ کنید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" disabled>
            ارسال درخواست (به زودی)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

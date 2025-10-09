export const revalidate = 60;

import Link from "next/link";
import type { LinkProps } from "next/link";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getCities } from "@/lib/location/cities";
import {
  getPublicJobFilters,
  getPublicJobs,
  type PublicJobQueryParams,
  type PublicJobSort,
} from "@/lib/jobs/publicQueries";
import {
  buildJobListingMetadata,
  buildJobPostingGraphJsonLd,
  getJobDescriptionSnippet,
  getJobOrganizationName,
} from "@/lib/jobs/seo";
import type { PublicJobWithOwner } from "@/lib/jobs/publicQueries";

const SORT_OPTIONS: { value: PublicJobSort; label: string }[] = [
  { value: "newest", label: "جدیدترین" },
  { value: "featured", label: "ویژه‌ها" },
  { value: "expiring", label: "رو به پایان" },
];

const BUTTON_BASE_CLASS =
  "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background";
const PRIMARY_BUTTON_CLASS = `${BUTTON_BASE_CLASS} bg-primary text-primary-foreground hover:bg-primary/90`;
const OUTLINE_BUTTON_CLASS = `${BUTTON_BASE_CLASS} border border-input bg-background hover:bg-accent hover:text-accent-foreground`;
const OUTLINE_BUTTON_DISABLED_CLASS = `${BUTTON_BASE_CLASS} border border-input bg-background text-muted-foreground`;

type RawSearchParams = Record<string, string | string[] | undefined>;

type NormalizedParams = PublicJobQueryParams & {
  sort?: PublicJobSort;
};

function getSingleParam(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function parseSort(value: string | undefined): PublicJobSort | undefined {
  if (!value) {
    return undefined;
  }

  if (SORT_OPTIONS.some((option) => option.value === value)) {
    return value as PublicJobSort;
  }

  return undefined;
}

function parseRemote(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parsePage(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return undefined;
  }

  return parsed;
}

function normalizeSearchParams(searchParams: RawSearchParams): NormalizedParams {
  const city = getSingleParam(searchParams.city);
  const category = getSingleParam(searchParams.category);
  const payType = getSingleParam(searchParams.payType);
  const sort = parseSort(getSingleParam(searchParams.sort));
  const page = parsePage(getSingleParam(searchParams.page));
  const remote = parseRemote(getSingleParam(searchParams.remote));

  return {
    city,
    category,
    payType,
    sort,
    page,
    remote,
  };
}

function resolveCityNameFactory(cityMap: Map<string, string>) {
  return (cityId: string | null): string | undefined => {
    if (!cityId) {
      return undefined;
    }

    return cityMap.get(cityId) ?? undefined;
  };
}

function formatPaySnippet(job: PublicJobWithOwner): string | null {
  if (job.payAmount !== null && job.payAmount !== undefined && job.currency) {
    try {
      const formatter = new Intl.NumberFormat("fa-IR", {
        style: "currency",
        currency: job.currency,
        maximumFractionDigits: 0,
      });

      return formatter.format(job.payAmount);
    } catch (error) {
      const fallback = new Intl.NumberFormat("fa-IR", {
        maximumFractionDigits: 0,
      }).format(job.payAmount);
      return `${fallback} ${job.currency}`;
    }
  }

  if (job.payType) {
    return `نوع پرداخت: ${job.payType}`;
  }

  return null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: RawSearchParams;
}): Promise<Metadata> {
  const normalized = normalizeSearchParams(searchParams);
  const cities = await getCities();
  const cityMap = new Map(cities.map((city) => [city.id, city.name] as const));
  const cityName = normalized.city ? cityMap.get(normalized.city) : undefined;

  return buildJobListingMetadata({
    cityName,
    category: normalized.category,
    remote: normalized.remote,
    payType: normalized.payType,
    page: normalized.page,
  });
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: RawSearchParams;
}) {
  const normalized = normalizeSearchParams(searchParams);

  const [cities, filters, jobsResult] = await Promise.all([
    getCities(),
    getPublicJobFilters(),
    getPublicJobs(normalized),
  ]);

  const cityMap = new Map(cities.map((city) => [city.id, city.name] as const));
  const resolveCityName = resolveCityNameFactory(cityMap);

  const persistedParams = new URLSearchParams();

  if (normalized.city) {
    persistedParams.set("city", normalized.city);
  }

  if (normalized.category) {
    persistedParams.set("category", normalized.category);
  }

  if (normalized.payType) {
    persistedParams.set("payType", normalized.payType);
  }

  if (normalized.sort) {
    persistedParams.set("sort", normalized.sort);
  }

  if (normalized.remote) {
    persistedParams.set("remote", "1");
  }

  const buildPageHref = (page: number): LinkProps<"/jobs">["href"] => {
    const params = new URLSearchParams(persistedParams);
    if (page > 1) {
      params.set("page", String(page));
    } else {
      params.delete("page");
    }

    const queryEntries = Object.fromEntries(params.entries());

    return {
      pathname: "/jobs",
      query: Object.keys(queryEntries).length > 0 ? queryEntries : undefined,
    };
  };

  const jsonLd =
    jobsResult.items.length > 0
      ? buildJobPostingGraphJsonLd(jobsResult.items, resolveCityName)
      : null;

  const now = new Date();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 pb-12" dir="rtl">
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>فرصت‌های شغلی</CardTitle>
          <CardDescription>
            جستجو و فیلتر فرصت‌های تایید شده برای بازیگران و هنرمندان.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" method="get">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="city">
                شهر
              </label>
              <select
                id="city"
                name="city"
                defaultValue={normalized.city ?? ""}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">همه شهرها</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="category">
                دسته‌بندی
              </label>
              <select
                id="category"
                name="category"
                defaultValue={normalized.category ?? ""}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">همه دسته‌ها</option>
                {filters.categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="payType">
                نوع پرداخت
              </label>
              <select
                id="payType"
                name="payType"
                defaultValue={normalized.payType ?? ""}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">همه گزینه‌ها</option>
                {filters.payTypes.map((payType) => (
                  <option key={payType} value={payType}>
                    {payType}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">امکان دورکاری</span>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="remote"
                  value="1"
                  defaultChecked={normalized.remote}
                  className="h-4 w-4 rounded border border-input"
                />
                فقط آگهی‌های دورکاری
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="sort">
                مرتب‌سازی
              </label>
              <select
                id="sort"
                name="sort"
                defaultValue={normalized.sort ?? "newest"}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <button type="submit" className={`${PRIMARY_BUTTON_CLASS} w-full`}>
                اعمال فیلترها
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {jobsResult.items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
          هیچ فرصت شغلی با فیلترهای فعلی یافت نشد.
          <div className="mt-4">
            <Link href="/jobs" className="text-primary underline">
              حذف فیلترها و مشاهده همه آگهی‌ها
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobsResult.items.map((job) => {
            const cityName = resolveCityName(job.cityId ?? null);
            const isFeatured = job.featuredUntil ? job.featuredUntil > now : false;
            const paySnippet = formatPaySnippet(job);
            const snippet = getJobDescriptionSnippet(job, 150);
            const organizationName = getJobOrganizationName(job);

            return (
              <Card key={job.id} className="flex h-full flex-col border border-border shadow-sm">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="line-clamp-2 text-lg font-semibold text-foreground">
                      {job.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {isFeatured ? <Badge variant="warning">ویژه</Badge> : null}
                      {job.remote ? <Badge variant="outline">دورکاری</Badge> : null}
                    </div>
                  </div>
                  <CardDescription className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>دسته‌بندی: {job.category}</span>
                    {cityName ? <span>شهر: {cityName}</span> : null}
                    <span>کارفرما: {organizationName}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{snippet}</p>
                  {paySnippet ? (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{paySnippet}</Badge>
                    </div>
                  ) : null}
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Link href={`/jobs/${job.id}`} className={OUTLINE_BUTTON_CLASS}>
                    مشاهده جزئیات
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {jobsResult.items.length > 0 ? (
        <div className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-3 text-sm">
          <span>
            صفحه {jobsResult.page} از {jobsResult.totalPages}
          </span>
          <div className="flex items-center gap-2">
            {jobsResult.page > 1 ? (
              <Link href={buildPageHref(jobsResult.page - 1)} className={OUTLINE_BUTTON_CLASS}>
                صفحه قبل
              </Link>
            ) : (
              <span className={OUTLINE_BUTTON_DISABLED_CLASS} aria-disabled>
                صفحه قبل
              </span>
            )}
            {jobsResult.page < jobsResult.totalPages ? (
              <Link href={buildPageHref(jobsResult.page + 1)} className={OUTLINE_BUTTON_CLASS}>
                صفحه بعد
              </Link>
            ) : (
              <span className={OUTLINE_BUTTON_DISABLED_CLASS} aria-disabled>
                صفحه بعد
              </span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

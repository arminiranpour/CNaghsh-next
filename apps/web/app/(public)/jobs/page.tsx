import Link from "next/link";
import type { Metadata } from "next";

import { Badge, badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPublicJobFilters } from "@/lib/jobs/publicQueries";
import { getCities } from "@/lib/location/cities";
import { fetchJobsOrchestrated } from "@/lib/orchestrators/jobs";
import { buildCanonical } from "@/lib/seo/canonical";
import {
  normalizeSearchParams,
  type NormalizedSearchParams,
} from "@/lib/url/normalizeSearchParams";
import { setSkillsSearchParam } from "@/lib/url/skillsParam";
import { cn } from "@/lib/utils";

const PAGE_TITLE = "فرصت‌های شغلی";
const DEFAULT_PAGE_SIZE = 12;
const REMOTE_FILTER_LABEL = "فقط فرصت‌های دورکاری";

const SORT_OPTIONS = [
  { value: "relevance", label: "مرتبط‌ترین" },
  { value: "newest", label: "جدیدترین" },
  { value: "featured", label: "ویژه" },
  { value: "expiry", label: "نزدیک به پایان" },
] as const;

const PAY_TYPE_OPTIONS = [
  { value: "paid", label: "پرداخت ثابت" },
  { value: "unpaid", label: "بدون پرداخت" },
  { value: "negotiable", label: "قابل مذاکره" },
] as const;

const PAY_TYPE_LABELS = new Map(PAY_TYPE_OPTIONS.map((option) => [option.value, option.label] as const));
const SORT_LABELS = new Map(SORT_OPTIONS.map((option) => [option.value, option.label] as const));

const SELECT_CLASSNAME =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const UPDATED_AT_FORMATTER = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
});

type SearchParams = Record<string, string | string[] | undefined>;

type FilterFormatterContext = {
  cityMap: Map<string, string>;
};

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  return {
    title: PAGE_TITLE,
    alternates: {
      canonical: buildCanonical("/jobs", searchParams),
    },
  };
}

export default async function JobsPage({ searchParams }: { searchParams: SearchParams }) {
  const normalized = normalizeSearchParams(searchParams);

  const [result, cities, filters] = await Promise.all([
    fetchJobsOrchestrated(searchParams),
    getCities(),
    getPublicJobFilters(),
  ]);

  const cityMap = new Map(cities.map((city) => [city.id, city.name] as const));
  const currentPage = result.page ?? normalized.page ?? 1;
  const pageSize = result.pageSize ?? DEFAULT_PAGE_SIZE;
  const hasNextPage = result.items.length === pageSize;
  const hasPrevPage = currentPage > 1;

  const normalizedForLinks: NormalizedSearchParams = {
    ...normalized,
    page: currentPage,
  };

  const appliedFilters = result.appliedFilters.map((chip) => {
    const label = formatFilterValue(chip.key, chip.value, { cityMap });
    const href = buildJobsHref(normalizedForLinks, () => {
      switch (chip.key) {
        case "query":
          return { query: undefined, page: undefined };
        case "city":
          return { city: undefined, page: undefined };
        case "category":
          return { category: undefined, page: undefined };
        case "payType":
          return { payType: undefined, page: undefined };
        case "remote":
          return { remote: undefined, page: undefined };
        case "sort":
          return { sort: undefined, page: undefined };
        default:
          return { page: undefined };
      }
    });

    return { ...chip, label, href };
  });

  const categories = Array.from(new Set(filters.categories ?? []))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "fa"));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10" dir="rtl">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-foreground">{PAGE_TITLE}</h1>
        <p className="text-sm text-muted-foreground">
          جستجوی فرصت‌های شغلی تاییدشده براساس عنوان، شهر، دسته‌بندی، نوع پرداخت و سایر فیلترها.
        </p>
      </header>

      <Card className="border-border bg-background/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">فیلترها</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="jobs-query">جستجو</Label>
              <Input
                id="jobs-query"
                name="query"
                type="search"
                placeholder="عنوان یا توضیحات آگهی"
                defaultValue={normalized.query ?? ""}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="jobs-city">شهر</Label>
              <select
                id="jobs-city"
                name="city"
                defaultValue={normalized.city ?? ""}
                className={SELECT_CLASSNAME}
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
              <Label htmlFor="jobs-category">دسته‌بندی</Label>
              <select
                id="jobs-category"
                name="category"
                defaultValue={normalized.category ?? ""}
                className={SELECT_CLASSNAME}
              >
                <option value="">همه دسته‌ها</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="jobs-payType">نوع پرداخت</Label>
              <select
                id="jobs-payType"
                name="payType"
                defaultValue={normalized.payType ?? ""}
                className={SELECT_CLASSNAME}
              >
                <option value="">همه گزینه‌ها</option>
                {PAY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3 lg:col-span-2">
              <div className="flex items-center gap-2">
                <input
                  id="jobs-remote"
                  name="remote"
                  type="checkbox"
                  value="true"
                  defaultChecked={normalized.remote === "true"}
                  className="h-4 w-4 border border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <Label htmlFor="jobs-remote" className="cursor-pointer">
                  {REMOTE_FILTER_LABEL}
                </Label>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="jobs-sort">مرتب‌سازی</Label>
              <select
                id="jobs-sort"
                name="sort"
                defaultValue={normalized.sort ?? ""}
                className={SELECT_CLASSNAME}
              >
                <option value="">پیش‌فرض (مرتبط‌ترین)</option>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button type="submit" className="w-full lg:w-auto">
                اعمال فیلترها
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {appliedFilters.length ? (
        <section aria-label="فیلترهای اعمال شده" className="flex flex-wrap gap-2">
          {appliedFilters.map((chip) => (
            <a
              key={`${chip.key}-${chip.value}`}
              href={chip.href}
              className={cn(
                badgeVariants({ variant: "outline" }),
                "group inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
              aria-label={`حذف فیلتر ${chip.label}`}
            >
              <span>{chip.label}</span>
              <span aria-hidden className="text-muted-foreground">
                ×
              </span>
            </a>
          ))}
        </section>
      ) : null}

      {result.items.length === 0 ? (
        <EmptyState normalized={normalizedForLinks} />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {result.items.map((item) => {
            const cityName = item.cityId ? cityMap.get(item.cityId) ?? item.cityId : "—";
            const isFeatured = Boolean(item.featuredUntil && new Date(item.featuredUntil) > new Date());
            const snippet = buildSnippet(item.description, 160);
            const updatedAtLabel = item.updatedAt ? UPDATED_AT_FORMATTER.format(new Date(item.updatedAt)) : null;

            return (
              <Card key={item.id} className="flex h-full flex-col justify-between border border-border bg-background/70 shadow-sm">
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-xl font-semibold text-foreground">{item.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      {isFeatured ? <Badge variant="warning">ویژه</Badge> : null}
                      {item.remote ? <Badge variant="outline">دورکاری</Badge> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>دسته‌بندی: {item.category || "—"}</span>
                    <span>شهر: {cityName}</span>
                    {updatedAtLabel ? <span>به‌روزرسانی: {updatedAtLabel}</span> : null}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {snippet || "توضیحات برای این آگهی ثبت نشده است."}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <Link href={`/jobs/${item.id}`} className="text-primary underline-offset-4 hover:underline">
                      مشاهده جزئیات
                    </Link>
                    <span className="text-xs text-muted-foreground">{`کد آگهی: ${item.id}`}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      <footer className="flex flex-col items-center justify-between gap-4 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row">
        <span>صفحه {currentPage}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={!hasPrevPage} className="min-w-[96px]" asChild>
            {hasPrevPage ? (
              <Link
                href={buildJobsHref(normalizedForLinks, () => ({
                  page: currentPage - 1 > 1 ? currentPage - 1 : undefined,
                }))}
              >
                قبلی
              </Link>
            ) : (
              <span>قبلی</span>
            )}
          </Button>
          <Button variant="outline" disabled={!hasNextPage} className="min-w-[96px]" asChild>
            {hasNextPage ? (
              <Link
                href={buildJobsHref(normalizedForLinks, () => ({
                  page: currentPage + 1,
                }))}
              >
                بعدی
              </Link>
            ) : (
              <span>بعدی</span>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}

type EmptyStateProps = {
  normalized: NormalizedSearchParams;
};

function EmptyState({ normalized }: EmptyStateProps) {
  return (
    <section className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-muted/40 p-10 text-center text-sm text-muted-foreground">
      <p>هیچ آگهی مطابق با فیلترهای انتخابی یافت نشد.</p>
      <Link
        href={buildJobsHref(normalized, () => ({
          query: undefined,
          city: undefined,
          category: undefined,
          payType: undefined,
          remote: undefined,
          sort: undefined,
          page: undefined,
        }))}
        className="text-primary underline-offset-4 hover:underline"
      >
        حذف فیلترها و مشاهده همه آگهی‌ها
      </Link>
    </section>
  );
}

function buildJobsHref(
  normalized: NormalizedSearchParams,
  overridesFactory: () => Partial<NormalizedSearchParams>,
) {
  const overrides = overridesFactory();
  const next: NormalizedSearchParams = { ...normalized, ...overrides };

  const params = new URLSearchParams();

  if (next.query) params.set("query", next.query);
  if (next.city) params.set("city", next.city);
  if (next.category) params.set("category", next.category);
  if (next.payType) params.set("payType", next.payType);
  if (next.sort) params.set("sort", next.sort);
  if (next.remote === "true") params.set("remote", "true");
  if (next.featured) params.set("featured", next.featured);
  if (Array.isArray(next.skills) && next.skills.length) {
    setSkillsSearchParam(params, next.skills);
  }

  const pageValue = overrides.page ?? next.page;
  if (pageValue && pageValue > 1) {
    params.set("page", pageValue.toString());
  }

  const search = params.toString();
  return search ? `/jobs?${search}` : "/jobs";
}

function formatFilterValue(key: string, value: string, context: FilterFormatterContext) {
  switch (key) {
    case "query":
      return `جستجو: ${value}`;
    case "city":
      return `شهر: ${context.cityMap.get(value) ?? value}`;
    case "category":
      return `دسته‌بندی: ${value}`;
    case "payType":
      return `نوع پرداخت: ${PAY_TYPE_LABELS.get(value) ?? value}`;
    case "remote":
      return REMOTE_FILTER_LABEL;
    case "sort":
      return `مرتب‌سازی: ${SORT_LABELS.get(value) ?? value}`;
    default:
      return value;
  }
}

function buildSnippet(description: string | null | undefined, length = 160) {
  if (!description) {
    return "";
  }

  const normalized = description.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  if (normalized.length <= length) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, length - 1))}…`;
}

import Link from "next/link";
import { notFound } from "next/navigation";

import type { UrlObject } from "url";
import type { JobModeration, JobStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JobsAdminTable, type JobAdminRow } from "@/components/admin/jobs/JobsAdminTable";
import { getServerAuthSession } from "@/lib/auth/session";
import { listJobsForAdmin } from "@/lib/jobs/admin/listJobs";
import { ALL_SELECT_OPTION_VALUE, normalizeSelectValue } from "@/lib/select";

const PAGE_SIZE = 20;

type SearchParams = Record<string, string | string[] | undefined>;

type ModerationOption =
  | typeof ALL_SELECT_OPTION_VALUE
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";
type StatusOption = typeof ALL_SELECT_OPTION_VALUE | "draft" | "published" | "closed";
type FeaturedOption = typeof ALL_SELECT_OPTION_VALUE | "1" | "0";

type ParsedFilters = {
  moderation?: JobModeration;
  status?: JobStatus;
  featured?: "ONLY" | "NONE";
  userQuery?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  moderationSelect: ModerationOption;
  statusSelect: StatusOption;
  featuredSelect: FeaturedOption;
  moderationQuery?: string;
  statusQuery?: string;
  featuredQuery?: string;
  userRaw?: string | undefined;
  searchRaw?: string | undefined;
  dateFromRaw?: string | undefined;
  dateToRaw?: string | undefined;
  page: number;
};

const DEFAULT_MODERATION_OPTION: ModerationOption = "pending";
const DEFAULT_STATUS_OPTION: StatusOption = ALL_SELECT_OPTION_VALUE;
const DEFAULT_FEATURED_OPTION: FeaturedOption = ALL_SELECT_OPTION_VALUE;

const MODERATION_MAP: Record<ModerationOption, JobModeration | undefined> = {
  [ALL_SELECT_OPTION_VALUE]: undefined,
  pending: "PENDING",
  approved: "APPROVED",
  rejected: "REJECTED",
  suspended: "SUSPENDED",
};

const STATUS_MAP: Record<StatusOption, JobStatus | undefined> = {
  [ALL_SELECT_OPTION_VALUE]: undefined,
  draft: "DRAFT",
  published: "PUBLISHED",
  closed: "CLOSED",
};

function getParam(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseDate(value?: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

function parseFilters(searchParams: SearchParams): ParsedFilters {
  const moderationParamRaw = getParam(searchParams, "moderation");
  const statusParamRaw = getParam(searchParams, "status");
  const featuredParamRaw = getParam(searchParams, "featured");
  const userParam = getParam(searchParams, "user") ?? undefined;
  const searchParam = getParam(searchParams, "q") ?? undefined;
  const dateFromParam = getParam(searchParams, "dateFrom") ?? undefined;
  const dateToParam = getParam(searchParams, "dateTo") ?? undefined;
  const pageParam = Number.parseInt(getParam(searchParams, "page") ?? "1", 10);

  const moderationSelect: ModerationOption = (() => {
    const normalized = normalizeSelectValue(moderationParamRaw)?.toLowerCase();
    if (
      normalized === "pending" ||
      normalized === "approved" ||
      normalized === "rejected" ||
      normalized === "suspended" ||
      normalized === ALL_SELECT_OPTION_VALUE
    ) {
      return normalized as ModerationOption;
    }
    return DEFAULT_MODERATION_OPTION;
  })();

  const statusSelect: StatusOption = (() => {
    const normalized = normalizeSelectValue(statusParamRaw)?.toLowerCase();
    if (
      normalized === "draft" ||
      normalized === "published" ||
      normalized === "closed" ||
      normalized === ALL_SELECT_OPTION_VALUE
    ) {
      return normalized as StatusOption;
    }
    return DEFAULT_STATUS_OPTION;
  })();

  const featuredSelect: FeaturedOption = (() => {
    const normalized = normalizeSelectValue(featuredParamRaw);
    if (normalized === "1" || normalized === "0") {
      return normalized;
    }
    return DEFAULT_FEATURED_OPTION;
  })();

  const moderation = MODERATION_MAP[moderationSelect] ?? "PENDING";
  const status = STATUS_MAP[statusSelect];
  const featured = featuredSelect === "1" ? "ONLY" : featuredSelect === "0" ? "NONE" : undefined;
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  return {
    moderation,
    status,
    featured,
    userQuery: userParam?.trim() ? userParam.trim() : undefined,
    search: searchParam?.trim() ? searchParam.trim() : undefined,
    dateFrom: parseDate(dateFromParam),
    dateTo: parseDate(dateToParam),
    moderationSelect,
    statusSelect,
    featuredSelect,
    moderationQuery: normalizeSelectValue(moderationSelect),
    statusQuery: normalizeSelectValue(statusSelect),
    featuredQuery: normalizeSelectValue(featuredSelect),
    userRaw: userParam ?? undefined,
    searchRaw: searchParam ?? undefined,
    dateFromRaw: dateFromParam ?? undefined,
    dateToRaw: dateToParam ?? undefined,
    page,
  } satisfies ParsedFilters;
}

function buildQuery(base: ParsedFilters, overrides: Record<string, string | undefined>): UrlObject {
  const query: Record<string, string> = {};

  const entries: Record<string, string | undefined> = {
    moderation: base.moderationQuery,
    status: base.statusQuery,
    featured: base.featuredQuery,
    user: base.userRaw,
    q: base.searchRaw,
    dateFrom: base.dateFromRaw,
    dateTo: base.dateToRaw,
    page: base.page.toString(),
    ...overrides,
  };

  for (const [key, value] of Object.entries(entries)) {
    if (value && value.length > 0) {
      query[key] = value;
    }
  }

  if (!query.page) {
    query.page = "1";
  }

  return {
    pathname: "/admin/jobs",
    query,
  } satisfies UrlObject;
}

export default async function AdminJobsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerAuthSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  const parsed = parseFilters(searchParams);

  const result = await listJobsForAdmin(
    {
      moderation: parsed.moderation,
      status: parsed.status,
      featured: parsed.featured,
      userQuery: parsed.userQuery,
      search: parsed.search,
      dateFrom: parsed.dateFrom,
      dateTo: parsed.dateTo,
    },
    { page: parsed.page, pageSize: PAGE_SIZE },
  );

  const jobs: JobAdminRow[] = result.items.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    moderation: item.moderation,
    featuredUntil: item.featuredUntil ? item.featuredUntil.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    owner: {
      id: item.user.id,
      name: item.user.name,
    },
  }));

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const hasPrevious = parsed.page > 1;
  const hasNext = parsed.page < totalPages;

  const totalLabel = new Intl.NumberFormat("fa-IR").format(result.total);

  return (
    <div className="space-y-6" dir="rtl">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">مدیریت آگهی‌های شغلی</h1>
        <p className="text-sm text-muted-foreground">
          بررسی و مدیریت وضعیت آگهی‌های کاربران، تغییر ویژه‌سازی و بستن آگهی‌ها.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-background p-4 shadow-sm">
        <form className="grid grid-cols-1 gap-4 lg:grid-cols-6" method="get">
          <input type="hidden" name="page" value="1" />
          <div className="space-y-2">
            <Label htmlFor="moderation">وضعیت بررسی</Label>
            <Select defaultValue={parsed.moderationSelect} name="moderation">
              <SelectTrigger id="moderation">
                <SelectValue placeholder="وضعیت بررسی" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="pending">در انتظار</SelectItem>
                <SelectItem value="approved">تأیید شده</SelectItem>
                <SelectItem value="rejected">رد شده</SelectItem>
                <SelectItem value="suspended">معلق</SelectItem>
                <SelectItem value={ALL_SELECT_OPTION_VALUE}>همه</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">وضعیت انتشار</Label>
            <Select defaultValue={parsed.statusSelect} name="status">
              <SelectTrigger id="status">
                <SelectValue placeholder="وضعیت انتشار" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL_SELECT_OPTION_VALUE}>همه</SelectItem>
                <SelectItem value="draft">پیش‌نویس</SelectItem>
                <SelectItem value="published">منتشرشده</SelectItem>
                <SelectItem value="closed">بسته</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="featured">ویژه بودن</Label>
            <Select defaultValue={parsed.featuredSelect} name="featured">
              <SelectTrigger id="featured">
                <SelectValue placeholder="همه" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL_SELECT_OPTION_VALUE}>همه</SelectItem>
                <SelectItem value="1">فقط ویژه</SelectItem>
                <SelectItem value="0">غیر ویژه</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user">مالک آگهی</Label>
            <Input id="user" name="user" placeholder="نام یا ایمیل" defaultValue={parsed.userRaw ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="q">جستجو در عنوان/توضیح</Label>
            <Input id="q" name="q" placeholder="عبارت مورد نظر" defaultValue={parsed.searchRaw ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateFrom">تاریخ ایجاد از</Label>
            <Input id="dateFrom" type="date" name="dateFrom" defaultValue={parsed.dateFromRaw ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateTo">تاریخ ایجاد تا</Label>
            <Input id="dateTo" type="date" name="dateTo" defaultValue={parsed.dateToRaw ?? ""} />
          </div>

          <div className="flex items-end gap-2 lg:col-span-6">
            <Button type="submit">اعمال فیلترها</Button>
            <Button variant="ghost" asChild>
              <Link href="/admin/jobs">حذف فیلترها</Link>
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>کل آگهی‌ها: {totalLabel}</span>
          <span>
            صفحه {parsed.page} از {totalPages}
          </span>
        </div>
        <JobsAdminTable jobs={jobs} />
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="sm"
            asChild
            disabled={!hasPrevious}
            className="min-w-24"
          >
            <Link href={buildQuery(parsed, { page: hasPrevious ? String(parsed.page - 1) : undefined })}>
              قبلی
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            disabled={!hasNext}
            className="min-w-24"
          >
            <Link href={buildQuery(parsed, { page: hasNext ? String(parsed.page + 1) : undefined })}>
              بعدی
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

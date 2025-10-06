import Link from "next/link";
import { redirect } from "next/navigation";
import { JobStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JobRow } from "@/components/dashboard/jobs/JobRow";
import { getServerAuthSession } from "@/lib/auth/session";
import { getJobCreditSummary } from "@/lib/entitlements/jobs";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { key: "all", label: "همه", status: null },
  { key: "draft", label: "پیش‌نویس", status: JobStatus.DRAFT },
  { key: "published", label: "منتشرشده", status: JobStatus.PUBLISHED },
  { key: "closed", label: "بسته", status: JobStatus.CLOSED },
] as const;

type DashboardJobsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function DashboardJobsPage({
  searchParams,
}: DashboardJobsPageProps) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const userId = session.user.id;

  const rawStatus = searchParams?.status;
  const statusKey = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;
  const normalizedStatusKey =
    typeof statusKey === "string" ? statusKey.toLowerCase() : undefined;
  const normalizedStatus = STATUS_FILTERS.some(
    (filter) => filter.key === normalizedStatusKey,
  )
    ? (normalizedStatusKey as (typeof STATUS_FILTERS)[number]["key"])
    : "all";

  const statusFilter = STATUS_FILTERS.find((filter) => filter.key === normalizedStatus);

  const rawPage = searchParams?.page;
  const pageParam = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  const pageNumber = Number.parseInt(pageParam ?? "1", 10);
  const currentPage = Number.isNaN(pageNumber) || pageNumber < 1 ? 1 : pageNumber;

  const whereClause = {
    userId,
    ...(statusFilter?.status ? { status: statusFilter.status } : {}),
  } satisfies Parameters<typeof prisma.job.findMany>[0]["where"];

  const skip = (currentPage - 1) * PAGE_SIZE;

  const [jobs, totalCount, creditSummary] = await Promise.all([
    prisma.job.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        status: true,
        moderation: true,
        createdAt: true,
        views: true,
      },
    }),
    prisma.job.count({ where: whereClause }),
    getJobCreditSummary(userId),
  ]);

  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const buildQuery = (params: { status?: string | null; page?: number }) => {
    const query = new URLSearchParams();

    const statusValue =
      params.status !== undefined ? params.status : normalizedStatus;

    if (statusValue && statusValue !== "all") {
      query.set("status", statusValue);
    }

    const pageValue = params.page ?? currentPage;

    if (pageValue > 1) {
      query.set("page", String(pageValue));
    }

    const queryString = query.toString();
    return queryString.length > 0 ? `?${queryString}` : "";
  };

  const creditLabel = creditSummary
    ? `اعتبارهای آگهی: ${creditSummary.remaining} باقیمانده`
    : "اعتبارهای آگهی: ۰ اعتبار موجود نیست";

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">آگهی‌ها</h1>
          <p className="text-sm text-muted-foreground">
            آگهی‌های ثبت‌شده را مدیریت، منتشر و بازنشر کنید.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/jobs/new">ایجاد آگهی</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>اعتبارهای آگهی</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{creditLabel}</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((filter) => {
          const isActive = filter.key === normalizedStatus;
          const href = buildQuery({ status: filter.key, page: 1 });
          return (
            <Button
              key={filter.key}
              asChild
              variant={isActive ? "default" : "outline"}
              size="sm"
            >
              <Link href={href}>{filter.label}</Link>
            </Button>
          );
        })}
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border/60 bg-muted/20 py-16 text-center">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">هنوز آگهی‌ای ثبت نکرده‌اید</h2>
            <p className="text-sm text-muted-foreground">
              برای جذب استعدادهای جدید، آگهی خود را ایجاد کنید.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/jobs/new">ایجاد آگهی</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">عنوان</TableHead>
                  <TableHead className="text-right">وضعیت</TableHead>
                  <TableHead className="text-right">وضعیت بررسی</TableHead>
                  <TableHead className="text-right">تاریخ ایجاد</TableHead>
                  <TableHead className="text-right">بازدیدها</TableHead>
                  <TableHead className="text-right">اقدامات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <JobRow
                    key={job.id}
                    job={{
                      id: job.id,
                      title: job.title,
                      status: job.status,
                      moderation: job.moderation,
                      createdAt: job.createdAt.toISOString(),
                      views: job.views,
                    }}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              صفحه {currentPage} از {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!hasPrevious}
                asChild={hasPrevious}
              >
                {hasPrevious ? (
                  <Link href={buildQuery({ page: currentPage - 1 })}>قبلی</Link>
                ) : (
                  <span>قبلی</span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNext}
                asChild={hasNext}
              >
                {hasNext ? (
                  <Link href={buildQuery({ page: currentPage + 1 })}>بعدی</Link>
                ) : (
                  <span>بعدی</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

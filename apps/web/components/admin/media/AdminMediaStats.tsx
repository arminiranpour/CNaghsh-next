"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const numberFormatter = new Intl.NumberFormat("fa-IR");
const dateFormatter = new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric" });

type MediaMetricsResponse = {
  totals: {
    videos: number;
    images: number;
    ready: number;
    failed: number;
    pendingModeration: number;
  };
  last7Days: {
    date: string;
    uploads: number;
    ready: number;
    failed: number;
  }[];
};

const LoadingState = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="p-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="mt-4 h-9 w-2/3" />
          <Skeleton className="mt-2 h-5 w-1/2" />
        </Card>
      ))}
    </div>
  );
};

const ErrorState = ({ message }: { message: string }) => {
  return (
    <Card className="border-destructive/40 bg-destructive/10 p-6 text-destructive">
      <CardHeader className="p-0">
        <CardTitle className="text-lg">خطا در دریافت آمار</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pt-3 text-sm">{message}</CardContent>
    </Card>
  );
};

const SummaryCard = ({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number;
  subtitle?: string;
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-3xl font-bold">{numberFormatter.format(value)}</div>
        {subtitle ? <div className="text-xs text-muted-foreground">{subtitle}</div> : null}
      </CardContent>
    </Card>
  );
};

const TrendCard = ({ data }: { data: MediaMetricsResponse["last7Days"] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-muted-foreground">۷ روز اخیر</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">داده‌ای برای نمایش وجود ندارد.</p>
        ) : (
          <div className="space-y-2">
            {data.map((item) => (
              <div key={item.date} className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground">{dateFormatter.format(new Date(item.date))}</div>
                <div className="flex items-center gap-3">
                  <span className="text-foreground">{numberFormatter.format(item.uploads)} آپلود</span>
                  <span className="text-emerald-600">{numberFormatter.format(item.ready)} آماده</span>
                  <span className="text-destructive">{numberFormatter.format(item.failed)} ناموفق</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export function AdminMediaStats() {
  const [metrics, setMetrics] = useState<MediaMetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/admin/media/metrics", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("پاسخ نامعتبر از سرور دریافت شد.");
        }
        const body = (await response.json()) as MediaMetricsResponse;
        if (!cancelled) {
          setMetrics(body);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "خطای ناشناخته رخ داد.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!metrics) {
    return <ErrorState message="داده‌ای دریافت نشد." />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title="کل ویدیوها"
        value={metrics.totals.videos}
        subtitle={`تصاویر: ${numberFormatter.format(metrics.totals.images)}`}
      />
      <SummaryCard
        title="آماده برای پخش"
        value={metrics.totals.ready}
        subtitle={`ناموفق: ${numberFormatter.format(metrics.totals.failed)}`}
      />
      <SummaryCard
        title="در انتظار بررسی"
        value={metrics.totals.pendingModeration}
        subtitle="محتواهایی که نیاز به تایید دارند"
      />
      <TrendCard data={metrics.last7Days} />
    </div>
  );
}

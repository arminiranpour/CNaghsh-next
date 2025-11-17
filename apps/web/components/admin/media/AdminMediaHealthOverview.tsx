"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MediaHealthResponse } from "@/lib/media/health";

const numberFormatter = new Intl.NumberFormat("fa-IR");

const LoadingGrid = () => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <Card key={index} className="p-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-3 h-9 w-20" />
        <Skeleton className="mt-2 h-4 w-32" />
      </Card>
    ))}
  </div>
);

const ErrorCard = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <Card className="border-destructive/40 bg-destructive/10 p-6 text-destructive">
    <div className="flex items-center justify-between">
      <CardTitle className="text-base">عدم دسترسی به وضعیت سلامت</CardTitle>
      <Button variant="outline" size="sm" onClick={onRetry}>
        تلاش دوباره
      </Button>
    </div>
    <CardContent className="p-0 pt-4 text-sm">{message}</CardContent>
  </Card>
);

const StatCard = ({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number;
  subtitle?: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{numberFormatter.format(value)}</div>
      {subtitle ? (
        <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
      ) : null}
    </CardContent>
  </Card>
);

export function AdminMediaHealthOverview() {
  const [health, setHealth] = useState<MediaHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/media/health", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("پاسخ نامعتبر از سرور دریافت شد.");
      }
      const body = (await response.json()) as MediaHealthResponse;
      setHealth(body);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "خطای ناشناخته رخ داد.",
      );
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <LoadingGrid />;
  }

  if (error) {
    return <ErrorCard message={error} onRetry={load} />;
  }

  if (!health) {
    return <ErrorCard message="داده‌ای دریافت نشد." onRetry={load} />;
  }

  const waitingJobs = health.queue.waiting;
  const failedRecent = health.recentFailures.length;
  const readyVideos = health.database.readyVideos;
  const pendingModeration = health.database.pendingModeration;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">وضعیت سلامت پردازش</h2>
          <p className="text-sm text-muted-foreground">
            صف ترنسکد، خطاهای اخیر و وضعیت کلی ویدیوها برای پایش سریع.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          به‌روزرسانی
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="ویدیوهای در صف"
          value={waitingJobs}
          subtitle="Jobs منتظر پردازش"
        />
        <StatCard
          title="خطاهای اخیر"
          value={failedRecent}
          subtitle="۱۰ مورد آخر از ترنسکد"
        />
        <StatCard
          title="ویدیوهای آماده"
          value={readyVideos}
          subtitle="قابل‌پخش برای کاربران"
        />
        <StatCard
          title="در انتظار بررسی"
          value={pendingModeration}
          subtitle="نیازمند تایید یا رد"
        />
      </div>
    </div>
  );
}

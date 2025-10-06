"use client";

import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { featureJobAction } from "@/app/(admin)/admin/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

type FeatureControlsProps = {
  jobId: string;
  featuredUntil?: string | null;
};

const PRESET_OPTIONS = [7, 14, 30] as const;
const ERROR_MESSAGE = "خطایی رخ داد. لطفاً دوباره تلاش کنید.";

function isFeaturedActive(featuredUntil?: string | null): boolean {
  if (!featuredUntil) {
    return false;
  }
  const date = new Date(featuredUntil);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return date.getTime() > Date.now();
}

function getPersianDateLabel(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(date);
}

function formatInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMinDate(): string {
  const nextDay = new Date();
  nextDay.setHours(0, 0, 0, 0);
  nextDay.setDate(nextDay.getDate() + 1);
  return formatInputDate(nextDay);
}

function getMaxDate(): string {
  const limit = new Date();
  limit.setHours(0, 0, 0, 0);
  limit.setDate(limit.getDate() + 60);
  return formatInputDate(limit);
}

export function FeatureControls({ jobId, featuredUntil }: FeatureControlsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [isPending, startTransition] = useTransition();

  const isActive = isFeaturedActive(featuredUntil);
  const featuredLabel = useMemo(() => getPersianDateLabel(featuredUntil), [featuredUntil]);

  const handleAction = (command: Parameters<typeof featureJobAction>[1]) => {
    startTransition(() => {
      featureJobAction(jobId, command)
        .then((result) => {
          if (result.ok) {
            toast({
              title:
                command.type === "CLEAR"
                  ? "ویژه‌سازی آگهی لغو شد."
                  : "آگهی به صورت ویژه نمایش داده می‌شود.",
            });
            setOpen(false);
            setCustomDate("");
            router.refresh();
          } else {
            toast({ variant: "destructive", title: "خطا", description: result.error ?? ERROR_MESSAGE });
          }
        })
        .catch(() => {
          toast({ variant: "destructive", title: "خطا", description: ERROR_MESSAGE });
        });
    });
  };

  const handlePreset = (days: (typeof PRESET_OPTIONS)[number]) => {
    handleAction({ type: "PRESET", days });
  };

  const handleCustomSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customDate) {
      toast({
        variant: "destructive",
        title: "خطا",
        description: "لطفاً تاریخ را انتخاب کنید.",
      });
      return;
    }

    handleAction({ type: "CUSTOM", until: customDate });
  };

  const toggleOpen = () => setOpen((prev) => !prev);

  return (
    <div className="relative">
      <Button size="sm" variant="secondary" onClick={toggleOpen} disabled={isPending}>
        {isActive ? "مدیریت ویژه" : "ویژه کردن"}
      </Button>
      {open ? (
        <div className="absolute left-0 z-20 mt-2 w-64 rounded-lg border border-border bg-background p-4 shadow-lg" dir="rtl">
          <div className="space-y-2 text-sm">
            <p className="font-medium">مدیریت ویژه‌سازی</p>
            {featuredLabel ? (
              <p className="text-muted-foreground">وضعیت کنونی: ویژه تا {featuredLabel}</p>
            ) : (
              <p className="text-muted-foreground">در حال حاضر ویژه نیست.</p>
            )}
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">افزودن مدت زمان</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_OPTIONS.map((days) => (
                <Button
                  key={days}
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => handlePreset(days)}
                >
                  {days} روز
                </Button>
              ))}
            </div>
            <form className="space-y-2" onSubmit={handleCustomSubmit}>
              <label className="block text-xs font-medium text-muted-foreground" htmlFor={`feature-date-${jobId}`}>
                تاریخ دلخواه
              </label>
              <Input
                id={`feature-date-${jobId}`}
                type="date"
                min={getMinDate()}
                max={getMaxDate()}
                value={customDate}
                onChange={(event) => setCustomDate(event.target.value)}
                disabled={isPending}
              />
              <Button type="submit" size="sm" className="w-full" disabled={isPending}>
                ثبت تاریخ
              </Button>
            </form>
            <Button
              size="sm"
              variant="ghost"
              className="w-full justify-center text-destructive"
              disabled={isPending}
              onClick={() => handleAction({ type: "CLEAR" })}
            >
              لغو ویژه‌سازی
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

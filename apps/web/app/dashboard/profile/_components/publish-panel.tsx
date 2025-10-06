"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

import { publishProfile, unpublishProfile } from "../actions";

type PersonalInfoSummary = {
  firstName?: string | null;
  lastName?: string | null;
  stageName?: string | null;
  age?: number | null;
  phone?: string | null;
  address?: string | null;
  cityName?: string | null;
  bio?: string | null;
};

type PublishPanelProps = {
  canPublish: boolean;
  isPublished: boolean;
  readinessIssues: string[];
  personalInfo: PersonalInfoSummary;
};

export function PublishPanel({
  canPublish,
  isPublished,
  readinessIssues,
  personalInfo,
}: PublishPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);

  const readyToPublish = readinessIssues.length === 0;

  const fullName = useMemo(() => {
    const first = personalInfo.firstName ?? "";
    const last = personalInfo.lastName ?? "";
    const stage = personalInfo.stageName?.trim();
    if (stage) {
      return `${stage}`;
    }
    return `${first} ${last}`.trim();
  }, [personalInfo.firstName, personalInfo.lastName, personalInfo.stageName]);

  const handlePublish = () => {
    setError(null);
    setFieldErrors([]);
    startTransition(() => {
      publishProfile()
        .then((result) => {
          if (result.ok) {
            toast({
              title: "پروفایل منتشر شد.",
              description: "پروفایل شما اکنون برای عموم قابل مشاهده است.",
            });
            router.refresh();
          } else {
            setError(result.error ?? null);
            if (result.fieldErrors) {
              const issues = Object.values(result.fieldErrors).filter(Boolean) as string[];
              setFieldErrors(issues);
            }
          }
        })
        .catch(() => {
          setError("خطایی رخ داد. لطفاً دوباره تلاش کنید.");
        });
    });
  };

  const handleUnpublish = () => {
    setError(null);
    setFieldErrors([]);
    startTransition(() => {
      unpublishProfile()
        .then((result) => {
          if (result.ok) {
            toast({
              title: "پروفایل لغو انتشار شد.",
              description: "پروفایل شما دیگر به‌صورت عمومی نمایش داده نمی‌شود.",
            });
            router.refresh();
          } else {
            setError(result.error ?? null);
          }
        })
        .catch(() => {
          setError("خطایی رخ داد. لطفاً دوباره تلاش کنید.");
        });
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={isPublished ? "default" : "secondary"} className="px-3 py-1">
          {isPublished ? "منتشر شده" : "پیش‌نویس"}
        </Badge>
        <Badge variant={readyToPublish ? "success" : "destructive"} className="px-3 py-1">
          {readyToPublish ? "آماده انتشار" : "نیازمند تکمیل اطلاعات"}
        </Badge>
        <Badge variant={canPublish ? "outline" : "destructive"} className="px-3 py-1">
          {canPublish ? "اشتراک فعال" : "بدون اشتراک"}
        </Badge>
      </div>

      <div className="space-y-3 text-sm leading-7 text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">نام نمایشی: </span>
          {fullName || "نامشخص"}
        </p>
        <p>
          <span className="font-semibold text-foreground">سن: </span>
          {personalInfo.age ?? "نامشخص"}
        </p>
        <p>
          <span className="font-semibold text-foreground">شهر: </span>
          {personalInfo.cityName ?? "نامشخص"}
        </p>
        <p>
          <span className="font-semibold text-foreground">شماره تماس (خصوصی): </span>
          {personalInfo.phone ?? "نامشخص"}
        </p>
        <p>
          <span className="font-semibold text-foreground">آدرس (خصوصی): </span>
          {personalInfo.address ?? "نامشخص"}
        </p>
        {personalInfo.bio ? (
          <p>
            <span className="font-semibold text-foreground">بیوگرافی: </span>
            {personalInfo.bio}
          </p>
        ) : null}
      </div>

      {readinessIssues.length > 0 ? (
        <div className="space-y-2 rounded-md border border-yellow-400/60 bg-yellow-100/60 p-4 text-sm text-yellow-900">
          <p className="font-semibold">برای انتشار، موارد زیر را تکمیل کنید:</p>
          <ul className="list-disc space-y-1 pr-5">
            {readinessIssues.map((issue, index) => (
              <li key={`${issue}-${index}`}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {fieldErrors.length > 0 ? (
        <div className="space-y-1 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {fieldErrors.map((message, index) => (
            <p key={`${message}-${index}`}>{message}</p>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={handlePublish}
          disabled={isPending || !canPublish || !readyToPublish}
        >
          {isPending ? "در حال پردازش..." : "انتشار پروفایل"}
        </Button>
        {isPublished ? (
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={handleUnpublish}
          >
            لغو انتشار
          </Button>
        ) : null}
      </div>
    </div>
  );
}

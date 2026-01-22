"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

import { unpublishProfile } from "@/lib/profile/profile-actions";

type PublishStatusBannerProps = {
  canPublish: boolean;
  isPublished: boolean;
};

export function PublishStatusBanner({
  canPublish,
  isPublished,
}: PublishStatusBannerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleUnpublish = () => {
    setError(null);
    startTransition(() => {
      unpublishProfile()
        .then((result) => {
          if (result.ok) {
            toast({
              title: "پروفایل لغو انتشار شد.",
              description: "پروفایل شما دیگر برای عموم قابل مشاهده نیست.",
            });
            router.refresh();
          } else {
            setError(result.error ?? "خطایی رخ داد.");
          }
        })
        .catch(() => {
          setError("خطایی رخ داد. لطفاً دوباره تلاش کنید.");
        });
    });
  };

  return (
    <div className="space-y-4" dir="rtl">
      {!canPublish ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-500/60 bg-amber-100/70 p-4 text-sm text-amber-900">
          <div className="space-y-1">
            <p className="font-semibold">برای انتشار پروفایل نیاز به اشتراک فعال دارید.</p>
            <p className="text-xs text-amber-900/80">
              با ارتقای اشتراک، امکان نمایش عمومی پروفایل برای شما فعال می‌شود.
            </p>
          </div>
          <Button asChild variant="outline" className="border-amber-600 text-amber-800 hover:bg-amber-200">
            <Link href="/pricing">مشاهده پلن‌های اشتراک</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-md border border-emerald-500/50 bg-emerald-100/60 p-4 text-sm text-emerald-900">
          اشتراک انتشار فعال است. پس از تکمیل اطلاعات می‌توانید پروفایل خود را منتشر کنید.
        </div>
      )}

      {isPublished ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-emerald-500/70 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center gap-3">
            <Badge variant="success" className="px-3 py-1">
              منتشر شده
            </Badge>
            <span>پروفایل شما هم‌اکنون در فهرست عمومی نمایش داده می‌شود.</span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleUnpublish}
            disabled={isPending}
          >
            لغو انتشار
          </Button>
          {error ? <p className="w-full text-sm text-destructive">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

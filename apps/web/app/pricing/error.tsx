"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function PricingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Pricing page error", error);
  }, [error]);

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-6 py-12 text-center">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-foreground">بروز خطا</h1>
        <p className="text-sm text-muted-foreground">
          در بارگذاری پلن‌ها مشکلی پیش آمد. لطفاً دوباره تلاش کنید.
        </p>
      </div>
      <Button onClick={reset} variant="default">
        تلاش مجدد
      </Button>
    </div>
  );
}

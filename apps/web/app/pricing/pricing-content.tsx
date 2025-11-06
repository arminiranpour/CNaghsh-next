"use client";

import { useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import type { ProviderName } from "@/lib/billing/provider.types";

import type { OneTimePrice, PricingPlan } from "./page";

type PricingContentProps = {
  plans: PricingPlan[];
  oneTimePrices: OneTimePrice[];
  initialUserId: string | null;
};

type CheckoutStartSuccess = {
  sessionId: string;
  redirectUrl: string;
};

type CheckoutStartError = {
  error?: string;
};

type SelectedPrice = {
  id: string;
  name: string;
  description?: string;
};

const providerOptions: { id: ProviderName; label: string }[] = [
  { id: "zarinpal", label: "زرین‌پال" },
  { id: "idpay", label: "آیدی‌پی" },
  { id: "nextpay", label: "نکست‌پی" },
];

const formatLimitValue = (value: unknown): string => {
  if (typeof value === "number") {
    return new Intl.NumberFormat("fa-IR").format(value);
  }

  if (typeof value === "boolean") {
    return value ? "بله" : "خیر";
  }

  if (value === null || value === undefined) {
    return "-";
  }

  return String(value);
};

export function PricingContent({
  plans,
  oneTimePrices,
  initialUserId,
}: PricingContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderName>(
    providerOptions[0].id,
  );
  const [selectedPrice, setSelectedPrice] = useState<SelectedPrice | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [effectiveUserId, setEffectiveUserId] = useState<string | null>(
    initialUserId,
  );
  const [userIdInput, setUserIdInput] = useState("");

  useEffect(() => {
    if (initialUserId) {
      setEffectiveUserId(initialUserId);
      setUserIdInput(initialUserId);
      try {
        localStorage.setItem("sandboxUserId", initialUserId);
      } catch (error) {
        // ignore storage errors in non-browser environments
      }
      return;
    }

    try {
      const stored = localStorage.getItem("sandboxUserId");
      if (stored) {
        setEffectiveUserId(stored);
        setUserIdInput(stored);
      }
    } catch (error) {
      // ignore storage errors in non-browser environments
    }
  }, [initialUserId]);

  useEffect(() => {
    if (!dialogOpen) {
      setSelectedPrice(null);
    }
  }, [dialogOpen]);

  const canCheckout = Boolean(effectiveUserId);

  const handleSelectPrice = (price: SelectedPrice) => {
    if (!canCheckout) {
      toast({
        title: "شناسه کاربر لازم است",
        description: "لطفاً ابتدا شناسه کاربر را برای تست ذخیره کنید.",
        variant: "destructive",
      });
      return;
    }

    setSelectedPrice(price);
    setSelectedProvider(providerOptions[0].id);
    setDialogOpen(true);
  };

  const handleSaveUserId = () => {
    const value = userIdInput.trim();
    if (!value) {
      toast({
        title: "شناسه نامعتبر است",
        description: "شناسه کاربر نمی‌تواند خالی باشد.",
        variant: "destructive",
      });
      return;
    }

    try {
      localStorage.setItem("sandboxUserId", value);
    } catch (error) {
      // ignore storage errors
    }

    setEffectiveUserId(value);
    toast({
      title: "ذخیره شد",
      description: "شناسه کاربر برای تست ذخیره شد.",
    });
  };

  const handleStartCheckout = async () => {
    if (!selectedPrice) {
      return;
    }

    if (!effectiveUserId) {
      toast({
        title: "شناسه کاربر لازم است",
        description: "لطفاً ابتدا شناسه کاربر را برای تست ذخیره کنید.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/checkout/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: effectiveUserId,
          provider: selectedProvider,
          priceId: selectedPrice.id,
        }),
      });
      const isJsonResponse = response.headers
        .get("content-type")
        ?.toLowerCase()
        .includes("application/json");

      let data: CheckoutStartSuccess | CheckoutStartError | null = null;
      if (isJsonResponse) {
        try {
          data = (await response.json()) as
            | CheckoutStartSuccess
            | CheckoutStartError;
        } catch (error) {
          console.error("Failed to parse checkout response", error);
          data = null;
        }
      }

      if (
        !response.ok ||
        !data ||
        !("sessionId" in data) ||
        !("redirectUrl" in data)
      ) {
        const errorMessage = data && "error" in data && data.error
          ? data.error
          : "خطا در شروع فرایند پرداخت";
        throw new Error(errorMessage);
      }

      setDialogOpen(false);
      toast({
        title: "در حال انتقال",
        description: "به درگاه انتخابی منتقل می‌شوید...",
      });
      router.push(`/checkout/${data.sessionId}` as Route);
      window.location.href = data.redirectUrl;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "خطای ناشناخته رخ داد";
      toast({
        title: "عدم موفقیت",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogTitle = useMemo(() => {
    if (!selectedPrice) {
      return "انتخاب درگاه";
    }

    return `انتخاب درگاه برای ${selectedPrice.name}`;
  }, [selectedPrice]);

  return (
    <div className="space-y-10">
      {!effectiveUserId && (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4">
          <label className="text-sm font-medium" htmlFor="sandbox-user-id">
            شناسه کاربر (برای تست)
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id="sandbox-user-id"
              value={userIdInput}
              onChange={(event) => setUserIdInput(event.target.value)}
              placeholder="مثلاً usr_123"
              className="flex-1"
            />
            <Button onClick={handleSaveUserId}>ذخیره</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            این مقدار فقط در مرورگر شما ذخیره می‌شود و برای تست درگاه لازم است.
          </p>
        </div>
      )}

      {initialUserId && (
        <p className="text-center text-sm text-muted-foreground">
          شناسه کاربر به‌صورت خودکار تنظیم شده است و دکمه‌های خرید فعال هستند.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">اشتراک</h2>
            <p className="text-sm text-muted-foreground">
              انتخاب یکی از پلن‌های اشتراک برای دسترسی کامل به امکانات.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {plans.map((plan) => (
              <Card key={plan.id} className="flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    دوره {plan.cycle}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-2xl font-bold text-primary">
                    {plan.price.formatted}
                  </div>
                  {plan.limits && Object.keys(plan.limits).length > 0 && (
                    <ul className="list-disc space-y-1 pr-5 text-sm text-muted-foreground">
                      {Object.entries(plan.limits).map(([key, value]) => (
                        <li key={key}>{formatLimitValue(value)}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() =>
                      handleSelectPrice({
                        id: plan.price.id,
                        name: plan.name,
                        description: plan.cycle,
                      })
                    }
                    disabled={!canCheckout}
                  >
                    خرید اشتراک
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">ثبت آگهی شغلی (تک خرید)</h2>
            <p className="text-sm text-muted-foreground">
              پرداخت یکباره برای انتشار یک آگهی شغلی.
            </p>
          </div>
          <div className="grid gap-4">
            {oneTimePrices.map((price) => (
              <Card key={price.id} className="flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-xl">{price.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {price.formatted}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() =>
                      handleSelectPrice({
                        id: price.id,
                        name: price.name,
                      })
                    }
                    disabled={!canCheckout}
                  >
                    پرداخت برای آگهی
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              درگاه پرداخت مورد نظر خود را انتخاب کنید و ادامه دهید.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {providerOptions.map((option) => (
                <Button
                  key={option.id}
                  variant={
                    selectedProvider === option.id ? "default" : "outline"
                  }
                  onClick={() => setSelectedProvider(option.id)}
                  type="button"
                  disabled={isSubmitting}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            {selectedPrice?.description && (
              <p className="text-sm text-muted-foreground">
                دوره انتخابی: {selectedPrice.description}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={handleStartCheckout}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? "در حال ارسال..." : "تایید و ادامه"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import type { ProviderName } from "@/lib/billing/provider.types";
import { formatRials } from "@/lib/money";

type SandboxRedirectContentProps = {
  sessionId: string | null;
  provider: ProviderName | null;
  amount: string | null;
  currency: string | null;
  returnUrl: string | null;
  secretConfigured: boolean;
};

type WebhookStatus = "OK" | "FAILED";

const providerLabels: Record<ProviderName, string> = {
  zarinpal: "زرین‌پال",
  idpay: "آیدی‌پی",
  nextpay: "نکست‌پی",
};

export function SandboxRedirectContent({
  sessionId,
  provider,
  amount,
  currency,
  returnUrl,
  secretConfigured,
}: SandboxRedirectContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState<WebhookStatus | null>(null);
  const [signatureInput, setSignatureInput] = useState("");
  const [activeSignature, setActiveSignature] = useState<string | null>(null);

  useEffect(() => {
    const hinted = process.env.NEXT_PUBLIC_WEBHOOK_SHARED_SECRET;
    if (hinted) {
      setSignatureInput(hinted);
      setActiveSignature(hinted);
      return;
    }

    try {
      const stored = localStorage.getItem("sandboxWebhookSignature");
      if (stored) {
        setSignatureInput(stored);
        setActiveSignature(stored);
      }
    } catch (error) {
      // ignore storage errors
    }
  }, []);

  const details = useMemo(() => {
    const numericAmount = amount ? Number(amount) : null;
    const formattedAmount =
      numericAmount !== null && Number.isFinite(numericAmount)
        ? formatRials(numericAmount)
        : amount ?? "-";

    return [
      { label: "شناسه نشست", value: sessionId ?? "-" },
      {
        label: "درگاه پرداخت",
        value: provider ? providerLabels[provider] : "نامشخص",
      },
      {
        label: "مبلغ",
        value: formattedAmount,
      },
      { label: "ارز", value: currency ?? "IRR" },
      { label: "آدرس بازگشت", value: returnUrl ?? "/checkout/<session>" },
    ];
  }, [amount, currency, provider, returnUrl, sessionId]);

  const canSend = Boolean(sessionId && provider);

  const handleSaveSignature = () => {
    const trimmed = signatureInput.trim();
    if (!trimmed) {
      setActiveSignature(null);
      try {
        localStorage.removeItem("sandboxWebhookSignature");
      } catch (error) {
        // ignore
      }
      toast({
        title: "امضا حذف شد",
        description: "درخواست‌ها بدون امضای وب‌هوک ارسال می‌شوند.",
      });
      return;
    }

    setActiveSignature(trimmed);
    try {
      localStorage.setItem("sandboxWebhookSignature", trimmed);
    } catch (error) {
      // ignore storage errors
    }

    toast({
      title: "امضا ذخیره شد",
      description: "امضای وب‌هوک برای درخواست‌های بعدی استفاده می‌شود.",
    });
  };

  const triggerWebhook = async (status: WebhookStatus) => {
    if (!sessionId || !provider) {
      toast({
        title: "اطلاعات ناقص است",
        description: "شناسه نشست و درگاه پرداخت باید مشخص باشد.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(status);
    const providerRef = `sandbox-${Date.now()}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    const signature = activeSignature?.trim();
    if (signature) {
      headers["X-Webhook-Signature"] = signature;
    }

    try {
      const response = await fetch(`/api/webhooks/${provider}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId,
          providerRef,
          status,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage =
          typeof result?.error === "string"
            ? result.error
            : "خطا در ارسال درخواست وب‌هوک";
        throw new Error(errorMessage);
      }

      toast({
        title: status === "OK" ? "پرداخت موفق" : "پرداخت ناموفق ثبت شد",
        description: "وب‌هوک با موفقیت ارسال شد.",
      });

      if (returnUrl) {
        window.location.href = returnUrl;
      } else {
        router.push(`/checkout/${sessionId}` as Route);
          }
        } catch (error) {
      const message =
        error instanceof Error ? error.message : "ارسال وب‌هوک با خطا مواجه شد";
      toast({
        title: "عدم موفقیت",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>شبیه‌ساز درگاه آزمایشی</CardTitle>
        <CardDescription>
          نتیجه پرداخت را برای آزمودن جریان‌های وب‌هوک انتخاب کنید.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {details.map((item) => (
            <div key={item.label} className="rounded-md border border-border p-3 text-right">
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="mt-1 text-sm font-medium leading-6">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>

        {(secretConfigured || activeSignature) && (
          <div className="space-y-2 rounded-md border border-dashed border-border p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="امضای وب‌هوک"
                value={signatureInput}
                onChange={(event) => setSignatureInput(event.target.value)}
              />
              <Button type="button" onClick={handleSaveSignature}>
                ذخیره امضا
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {secretConfigured
                ? "محیط فعلی نیاز به هدر امضای وب‌هوک دارد."
                : "در صورت نیاز می‌توانید امضا را وارد کنید؛ در غیر این صورت خالی بگذارید."}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button
          className="w-full sm:w-auto"
          onClick={() => triggerWebhook("OK")}
          disabled={!canSend || isSubmitting !== null}
        >
          {isSubmitting === "OK" ? "در حال ارسال..." : "تأیید پرداخت (موفق)"}
        </Button>
        <Button
          className="w-full sm:w-auto"
          variant="outline"
          onClick={() => triggerWebhook("FAILED")}
          disabled={!canSend || isSubmitting !== null}
        >
          {isSubmitting === "FAILED" ? "در حال ارسال..." : "پرداخت ناموفق"}
        </Button>
      </CardFooter>
    </Card>
  );
}
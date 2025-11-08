"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, AlertTriangle, Check, Info, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { formatJalaliDate } from "@/lib/datetime/jalali";
import { emitPricingTelemetry } from "@/lib/pricing/telemetry";

import type {
  CadenceKey,
  NormalizedComparison,
  NormalizedValue,
  OneTimePrice,
  PricingPlanCadence,
  PricingPlanGroupData,
  PricingViewer,
} from "./page";
import { renewSubscriptionFromPricing } from "./actions";

const PROVIDER_ID = "zarinpal";
const BILLING_PATH = "/dashboard/billing" as Route;
const SIGN_IN_PATH = "/auth/signin" as Route;
const SUPPORT_EMAIL = "support@example.com";
const SUPPORT_PHONE = "02100000000";
const PRORATION_TOOLTIP = {
  "next-cycle": "تغییر پلن از چرخه بعدی اعمال می‌شود.",
  prorated: "تغییر پلن ممکن است به‌صورت نسبی محاسبه شود.",
} as const;

type PricingContentProps = {
  plans: PricingPlanGroupData[];
  cadenceLabels: Record<CadenceKey, string>;
  initialCadence: CadenceKey;
  viewer: PricingViewer;
  jobOffers: OneTimePrice[];
};

type ComparisonRow = {
  key: string;
  label: string;
  values: Record<string, NormalizedComparison | undefined>;
};

type CadenceOption = {
  key: CadenceKey;
  label: string;
};

const getAvailableCadences = (plans: PricingPlanGroupData[]): CadenceKey[] => {
  const set = new Set<CadenceKey>();
  plans.forEach((plan) => {
    (Object.keys(plan.cadences) as CadenceKey[]).forEach((key) => {
      if (plan.cadences[key]) {
        set.add(key);
      }
    });
  });
  return Array.from(set.values());
};

const isActiveStatus = (status: string | undefined): boolean => {
  if (!status) {
    return false;
  }
  return status === "active" || status === "renewing";
};

const computeAnnualSavings = (cadences: Partial<Record<CadenceKey, PricingPlanCadence>>): number => {
  const monthly = cadences.monthly;
  const annual = cadences.annual;
  if (!monthly || !annual || monthly.amount <= 0) {
    return 0;
  }
  const savings = 1 - annual.amount / (monthly.amount * 12);
  if (!Number.isFinite(savings) || savings <= 0) {
    return 0;
  }
  return Math.round(savings * 100);
};

const renderValue = (value: NormalizedValue | undefined) => {
  if (!value) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (value.kind === "boolean") {
    if (value.raw) {
      return (
        <span className="inline-flex items-center gap-2 text-emerald-600">
          <Check className="h-4 w-4" aria-hidden />
          <span className="sr-only">دارد</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <X className="h-4 w-4" aria-hidden />
        <span className="sr-only">ندارد</span>
      </span>
    );
  }

  if (value.kind === "number") {
    return <span className="font-medium text-foreground">{value.valueLabel}</span>;
  }

  return <span className="text-foreground">{value.valueLabel}</span>;
};

const ComparisonTable = ({
  rows,
  plans,
}: {
  rows: ComparisonRow[];
  plans: PricingPlanGroupData[];
}) => {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm md:block">
        <table className="w-full border-collapse text-right text-sm" aria-label="جدول مقایسه ویژگی‌ها">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                ویژگی‌ها
              </th>
              {plans.map((plan) => (
                <th
                  key={plan.groupId}
                  scope="col"
                  className="px-4 py-3 text-right font-medium"
                >
                  <div className="flex flex-col gap-1 text-right">
                    <span className="font-semibold text-foreground">{plan.name}</span>
                    {plan.tagline ? (
                      <span className="text-xs text-muted-foreground">{plan.tagline}</span>
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-border/60">
                <th scope="row" className="px-4 py-4 align-top text-sm font-medium text-foreground">
                  {row.label}
                </th>
                {plans.map((plan) => (
                  <td key={plan.groupId} className="px-4 py-4 align-top">
                    <div className="space-y-2">
                      {renderValue(row.values[plan.groupId]?.value)}
                      {row.values[plan.groupId]?.footnote ? (
                        <p className="text-xs text-muted-foreground">
                          {row.values[plan.groupId]?.footnote}
                        </p>
                      ) : null}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        {plans.map((plan) => (
          <div key={plan.groupId} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">{plan.name}</p>
                {plan.tagline ? (
                  <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                ) : null}
              </div>
            </div>
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.key} className="rounded-lg border border-border/70 p-3">
                  <p className="text-sm font-medium text-foreground">{row.label}</p>
                  <div className="mt-2 text-sm text-foreground">
                    {renderValue(row.values[plan.groupId]?.value)}
                  </div>
                  {row.values[plan.groupId]?.footnote ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {row.values[plan.groupId]?.footnote}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const useComparisonRows = (
  plans: PricingPlanGroupData[],
): ComparisonRow[] => {
  return useMemo(() => {
    const orderedPlans = [...plans];
    const keyMap = new Map<string, string>();
    orderedPlans.forEach((plan) => {
      Object.values(plan.comparison).forEach((item) => {
        if (!keyMap.has(item.key)) {
          keyMap.set(item.key, item.label);
        }
      });
    });

    return Array.from(keyMap.entries()).map(([key, label]) => {
      const values: Record<string, NormalizedComparison | undefined> = {};
      orderedPlans.forEach((plan) => {
        values[plan.groupId] = plan.comparison[key];
      });
      return { key, label, values } satisfies ComparisonRow;
    });
  }, [plans]);
};

const formatCadenceLabel = (
  labels: Record<CadenceKey, string>,
  cadence: CadenceKey,
): string => {
  return labels[cadence];
};

const buildCallbackUrl = (
  pathname: string,
  searchParams: URLSearchParams,
  planId: string,
  cadence: CadenceKey,
): string => {
  const params = new URLSearchParams(searchParams.toString());
  params.set("cadence", cadence);
  params.set("plan", planId);
  return `${pathname}?${params.toString()}`;
};

export function PricingContent({
  plans,
  cadenceLabels,
  initialCadence,
  viewer,
  jobOffers,
}: PricingContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [selectedCadence, setSelectedCadence] = useState<CadenceKey>(initialCadence);
  const [pendingPriceId, setPendingPriceId] = useState<string | null>(null);
  const [isRenewPending, startRenewTransition] = useTransition();
  const availableCadences = useMemo(() => getAvailableCadences(plans), [plans]);
  const cadenceOptions: CadenceOption[] = availableCadences
    .map((key) => ({ key, label: cadenceLabels[key] }))
    .sort((a, b) => (a.key === "monthly" ? -1 : b.key === "monthly" ? 1 : 0));
  const comparisonRows = useComparisonRows(plans);
  const hasComparison = comparisonRows.length > 0;
  const activeSubscription = viewer.subscription;
  const activePlanGroupId = activeSubscription?.groupId ?? null;
  const activeCycle = activeSubscription?.cycle ?? null;
  const activeEndsAtLabel = activeSubscription?.endsAt
    ? formatJalaliDate(activeSubscription.endsAt)
    : null;
  const prorationMessage = PRORATION_TOOLTIP["next-cycle"];

  useEffect(() => {
    emitPricingTelemetry("pricing_viewed", {
      cadence: selectedCadence,
      plan_count: plans.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!searchParams) {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("cadence", selectedCadence);
    router.replace(`${pathname}?${params.toString()}` as Route, { scroll: false });
  }, [pathname, router, searchParams, selectedCadence]);

  const handleCadenceChange = (next: CadenceKey) => {
    if (next === selectedCadence) {
      return;
    }
    emitPricingTelemetry("pricing_toggle_cadence", {
      from: selectedCadence,
      to: next,
    });
    setSelectedCadence(next);
  };

  const handleCheckout = async (
    plan: PricingPlanGroupData,
    cadence: CadenceKey,
    price: PricingPlanCadence,
    options?: { type?: "subscription" | "one-time" },
  ) => {
    if (pendingPriceId) {
      return;
    }

    if (viewer.state === "guest" || !viewer.userId) {
      emitPricingTelemetry("pricing_cta_blocked", {
        reason: "auth_required",
        plan_id: price.planId,
        cadence,
      });
      const callback = buildCallbackUrl(
        pathname,
        new URLSearchParams(searchParams?.toString() ?? ""),
        plan.groupId,
        cadence,
      );
      router.push(
        `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(callback)}` as Route,
      );
      toast({
        description: "برای ادامه وارد حساب خود شوید.",
      });
      return;
    }

    setPendingPriceId(price.priceId);
    emitPricingTelemetry("pricing_cta_clicked", {
      plan_id: price.planId,
      cadence,
      user_state: viewer.state,
      mode: options?.type ?? "subscription",
    });

    try {
      const body = {
        userId: viewer.userId,
        provider: PROVIDER_ID,
        priceId: price.priceId,
        returnUrl:
          typeof window !== "undefined"
            ? buildCallbackUrl(
                window.location.pathname,
                new URLSearchParams(window.location.search),
                plan.groupId,
                cadence,
              )
            : undefined,
      };
      const response = await fetch("/api/checkout/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const isJson = response.headers
        .get("content-type")
        ?.toLowerCase()
        .includes("application/json");

      const data = isJson ? await response.json() : null;

      if (!response.ok || !data?.sessionId || !data?.redirectUrl) {
        throw new Error(data?.error ?? "خطا در شروع فرایند پرداخت");
      }

      router.push(`/checkout/${data.sessionId}` as Route);
      if (typeof window !== "undefined") {
        window.location.href = data.redirectUrl as string;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "خطای ناشناخته رخ داد";
      toast({
        title: "پرداخت ناموفق",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPendingPriceId(null);
    }
  };

  const handleRenew = (cadence: CadenceKey) => {
    if (!viewer.subscription) {
      return;
    }
    startRenewTransition(async () => {
      try {
        const result = await renewSubscriptionFromPricing({
          cadence,
        });
        if (!result.ok) {
          toast({
            title: "تمدید ناموفق",
            description: result.error,
            variant: "destructive",
          });
          return;
        }
        const { sessionId, redirectUrl } = result.data;
        emitPricingTelemetry("pricing_cta_clicked", {
          plan_id: viewer.subscription.planId,
          cadence,
          user_state: viewer.state,
          mode: "renew",
        });
        router.push(`/checkout/${sessionId}` as Route);
        if (typeof window !== "undefined") {
          window.location.href = redirectUrl;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "تمدید انجام نشد";
        toast({
          title: "تمدید ناموفق",
          description: message,
          variant: "destructive",
        });
      }
    });
  };

  const orderedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      if (a.highlight && !b.highlight) {
        return -1;
      }
      if (b.highlight && !a.highlight) {
        return 1;
      }
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.name.localeCompare(b.name, "fa");
    });
  }, [plans]);

  const renderPlanCard = (plan: PricingPlanGroupData) => {
    const cadencePrice = plan.cadences[selectedCadence];
    const isSelectedActive =
      isActiveStatus(activeSubscription?.status) &&
      activePlanGroupId === plan.groupId &&
      activeCycle === selectedCadence;
    const isGroupActive =
      isActiveStatus(activeSubscription?.status) &&
      activePlanGroupId === plan.groupId;
    const savingsPercent = computeAnnualSavings(plan.cadences);
    const disabledReason = !cadencePrice
      ? "این دوره برای این پلن در دسترس نیست."
      : isSelectedActive
        ? "این پلن با همین دوره برای شما فعال است."
        : null;
    const isProcessing = pendingPriceId === cadencePrice?.priceId;

    const manageButtons = isSelectedActive ? (
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" asChild>
          <Link href={BILLING_PATH}>مدیریت اشتراک</Link>
        </Button>
        <Button
          variant="default"
          onClick={() => handleRenew(selectedCadence)}
          disabled={isRenewPending}
        >
          {isRenewPending ? "در حال انتقال..." : "تمدید اکنون"}
        </Button>
      </div>
    ) : null;

    const showUpgradeTooltip =
      isGroupActive && !isSelectedActive && cadencePrice !== undefined;

    const ctaLabel = (() => {
      if (!cadencePrice) {
        return "نامشخص";
      }
      if (viewer.state === "guest") {
        return "شروع";
      }
      if (!isActiveStatus(activeSubscription?.status)) {
        return "خرید اشتراک";
      }
      if (isSelectedActive) {
        return "مدیریت اشتراک";
      }
      return "ارتقا / تغییر پلن";
    })();

    const helperText = viewer.state === "guest" ? "برای ادامه وارد شوید." : undefined;

    const onDisabledClick = disabledReason
      ? (event: React.MouseEvent<HTMLDivElement>) => {
          event.preventDefault();
          emitPricingTelemetry("pricing_cta_blocked", {
            reason: !cadencePrice ? "checkout_unavailable" : "already_active",
            plan_id: cadencePrice?.planId ?? plan.groupId,
            cadence: selectedCadence,
          });
          toast({ description: disabledReason });
        }
      : undefined;

    return (
      <Card
        key={plan.groupId}
        className={`flex h-full flex-col justify-between border-2 transition ${plan.highlight ? "border-primary shadow-lg" : "border-border"}`}
      >
        <CardHeader className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-2xl font-bold text-foreground">
                  {plan.name}
                </CardTitle>
                {plan.highlight ? (
                  <Badge variant="warning" className="whitespace-nowrap">
                    {plan.badgeLabel ?? "پیشنهاد ما"}
                  </Badge>
                ) : null}
              </div>
              {plan.tagline ? (
                <p className="text-sm text-muted-foreground">{plan.tagline}</p>
              ) : null}
              {plan.persona ? (
                <p className="text-xs text-muted-foreground">مناسب برای {plan.persona}</p>
              ) : null}
            </div>
            {isGroupActive && activeEndsAtLabel ? (
              <Badge variant="success" className="whitespace-nowrap text-xs">
                اشتراک فعال تا {activeEndsAtLabel}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {cadencePrice ? (
              <div className="text-3xl font-extrabold text-foreground">
                {cadencePrice.formattedAmount}
                <span className="mr-2 text-sm font-medium text-muted-foreground">
                  / {formatCadenceLabel(cadenceLabels, selectedCadence)}
                </span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">برای این دوره موجود نیست.</div>
            )}
            {savingsPercent > 0 ? (
              <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <Check className="h-4 w-4" aria-hidden />
                صرفه‌جویی {savingsPercent.toLocaleString("fa-IR")}% نسبت به ماهانه
              </div>
            ) : null}
          </div>
          <ul className="space-y-2 text-sm text-foreground">
            {plan.features.slice(0, 6).map((feature) => (
              <li key={feature.key} className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
                <div>
                  <span className="font-medium">{feature.primary}</span>
                  {feature.secondary ? (
                    <p className="text-xs text-muted-foreground">{feature.secondary}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {plan.note ? (
            <div className="flex items-center gap-2 rounded-md border border-dashed border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground">
              <Info className="h-4 w-4" aria-hidden />
              <span>{plan.note}</span>
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          {manageButtons ? (
            manageButtons
          ) : (
            <Fragment>
              <div
                onClick={onDisabledClick}
                role="none"
                className="w-full"
              >
                <Button
                  className="w-full"
                  onClick={() =>
                    cadencePrice &&
                    handleCheckout(plan, selectedCadence, cadencePrice, { type: "subscription" })
                  }
                  disabled={Boolean(disabledReason) || !cadencePrice || isProcessing}
                  title={disabledReason ?? undefined}
                >
                  {isProcessing ? "در حال انتقال..." : ctaLabel}
                </Button>
              </div>
              {helperText ? (
                <p className="text-xs text-muted-foreground">{helperText}</p>
              ) : null}
              {showUpgradeTooltip ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-4 w-4" aria-hidden />
                  <span>{prorationMessage}</span>
                </div>
              ) : null}
            </Fragment>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <Link href="/help/faq">سؤالات متداول</Link>
            <span aria-hidden>•</span>
            <Link href="/legal/terms">شرایط استفاده</Link>
            <span aria-hidden>•</span>
            <Link href="/legal/refund">خط‌مشی بازپرداخت (محیط آزمایشی)</Link>
          </div>
        </CardFooter>
      </Card>
    );
  };

  const renderJobOffer = (offer: OneTimePrice) => {
    const isProcessing = pendingPriceId === offer.id;
    return (
      <Card key={offer.id} className="flex h-full flex-col justify-between border-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">
            {offer.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-3xl font-extrabold text-foreground">{offer.formatted}</p>
          <p className="text-sm text-muted-foreground">
            پرداخت یکباره برای انتشار آگهی شغلی در بازارگاه.
          </p>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={() =>
              handleCheckout(
                {
                  groupId: offer.id,
                  name: offer.name,
                  tagline: undefined,
                  persona: undefined,
                  highlight: false,
                  badgeLabel: undefined,
                  order: 0,
                  features: [],
                  comparison: {},
                  cadences: {},
                  note: undefined,
                } as PricingPlanGroupData,
                selectedCadence,
                {
                  planId: offer.id,
                  priceId: offer.id,
                  cycle: "MONTHLY" as PricingPlanCadence["cycle"],
                  amount: offer.amount,
                  formattedAmount: offer.formatted,
                },
                { type: "one-time" },
              )
            }
            disabled={isProcessing}
          >
            {isProcessing ? "در حال انتقال..." : "پرداخت برای آگهی"}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="container space-y-12 py-12">
      {activeSubscription?.cancelAtPeriodEnd ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-5 w-5" aria-hidden />
            لغو در پایان دوره برنامه‌ریزی شده است.
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-amber-800">
            برای مدیریت درخواست لغو می‌توانید از داشبورد صورتحساب اقدام کنید.
            <Button variant="outline" size="sm" asChild>
              <Link href={BILLING_PATH}>لغو درخواست لغو</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <section className="space-y-4 text-center">
        <h1 className="text-3xl font-bold text-foreground">پلن‌های قیمت‌گذاری</h1>
        <p className="text-sm text-muted-foreground">
          پلن مناسب خود را انتخاب کنید، ویژگی‌ها را مقایسه کنید و با خیال راحت پرداخت کنید.
        </p>
        {cadenceOptions.length > 1 ? (
          <div className="flex justify-center">
            <div
              role="radiogroup"
              aria-label="انتخاب دوره پرداخت"
              className="inline-flex rounded-full border border-border bg-card p-1 shadow-sm"
            >
              {cadenceOptions.map((option) => {
                const isActive = option.key === selectedCadence;
                return (
                  <button
                    key={option.key}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => handleCadenceChange(option.key)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {orderedPlans.map((plan) => renderPlanCard(plan))}
      </section>

      {jobOffers.length > 0 ? (
        <section className="space-y-4">
          <div className="space-y-1 text-right">
            <h2 className="text-2xl font-semibold text-foreground">خرید تکی</h2>
            <p className="text-sm text-muted-foreground">
              نیاز به اشتراک ندارید؟ آگهی خود را به صورت تکی منتشر کنید.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobOffers.map((offer) => renderJobOffer(offer))}
          </div>
        </section>
      ) : null}

      {hasComparison ? (
        <section className="space-y-4">
          <div className="space-y-1 text-right">
            <h2 className="text-2xl font-semibold text-foreground">مقایسه جزئیات پلن‌ها</h2>
            <p className="text-sm text-muted-foreground">
              ویژگی‌های کلیدی و محدودیت‌ها را کنار هم ببینید.
            </p>
          </div>
          <ComparisonTable rows={comparisonRows} plans={orderedPlans} />
        </section>
      ) : null}

      <footer className="rounded-2xl border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <AlertCircle className="h-5 w-5" aria-hidden />
            در صورت بروز مشکل در پرداخت یا سوال درباره پلن‌ها با پشتیبانی در تماس باشید.
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href={`mailto:${SUPPORT_EMAIL}`}>ایمیل پشتیبانی</Link>
            <span aria-hidden>•</span>
            <Link href="/help/faq">سؤالات متداول</Link>
            <span aria-hidden>•</span>
            <a href={`tel:${SUPPORT_PHONE}`}>{SUPPORT_PHONE}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

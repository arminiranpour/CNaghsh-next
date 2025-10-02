
import { PlanCycle, ProductType } from "@prisma/client";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { formatRials } from "@/lib/money";
import { PricingContent } from "./pricing-content";

export const metadata: Metadata = {
  title: "قیمت‌گذاری",
};

const cycleLabels: Record<PlanCycle, string> = {
  [PlanCycle.MONTHLY]: "ماهانه",
  [PlanCycle.QUARTERLY]: "فصلی",
  [PlanCycle.YEARLY]: "سالانه",
};

export type PricingPlan = {
  id: string;
  name: string;
  cycle: string;
  price: {
    id: string;
    amount: number;
    formatted: string;
  };
  limits: Record<string, unknown> | null;
};

export type OneTimePrice = {
  id: string;
  name: string;
  amount: number;
  formatted: string;
};

const serializeLimits = (limits: unknown): Record<string, unknown> | null => {
  if (!limits || typeof limits !== "object") {
    return null;
  }

  if (Array.isArray(limits)) {
    return limits.reduce<Record<string, unknown>>((acc, value, index) => {
      acc[index.toString()] = value;
      return acc;
    }, {});
  }

  return limits as Record<string, unknown>;
};

const getInitialUserId = (value: string | string[] | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const plans = await prisma.plan.findMany({
    where: {
      active: true,
      product: {
        active: true,
        type: ProductType.SUBSCRIPTION,
      },
    },
    include: {
      prices: {
        where: {
          active: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const planItems: PricingPlan[] = plans
    .map((plan) => {
      const activePrice = plan.prices[0];
      if (!activePrice) {
        return null;
      }

      return {
        id: plan.id,
        name: plan.name,
        cycle: cycleLabels[plan.cycle],
        limits: serializeLimits(plan.limits),
        price: {
          id: activePrice.id,
          amount: activePrice.amount,
          formatted: formatRials(activePrice.amount),
        },
      } satisfies PricingPlan;
    })
    .filter(Boolean) as PricingPlan[];

  const oneTimePricesRaw = await prisma.price.findMany({
    where: {
      active: true,
      product: {
        active: true,
        type: ProductType.JOB_POST,
      },
    },
    include: {
      product: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const oneTimePrices: OneTimePrice[] = oneTimePricesRaw.map((price) => ({
    id: price.id,
    name: price.product?.name ?? "ثبت آگهی شغلی",
    amount: price.amount,
    formatted: formatRials(price.amount),
  }));

  const initialUserId = getInitialUserId(searchParams?.userId);

  return (
    <div className="container space-y-10 py-12">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold">پلن‌های قیمت‌گذاری</h1>
        <p className="text-muted-foreground">
          اشتراک مناسب خود را انتخاب کنید یا به‌صورت تک خرید آگهی ثبت نمایید.
        </p>
      </div>
      <PricingContent
        plans={planItems}
        oneTimePrices={oneTimePrices}
        initialUserId={initialUserId}
      />
    </div>
  );
}
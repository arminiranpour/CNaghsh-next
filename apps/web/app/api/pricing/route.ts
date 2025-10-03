import { NextResponse } from "next/server";

import { ProductType } from "@prisma/client";

import { prisma } from "@/lib/db";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

export async function GET() {
  const plans = await prisma.plan.findMany({
    where: {
      active: true,
      product: {
        active: true,
        type: ProductType.SUBSCRIPTION,
      },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
        },
      },
      prices: {
        where: {
          active: true,
          currency: "IRR",
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          active: true,
        },
        orderBy: {
          amount: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const subscriptions = plans.map((plan) => ({
    planId: plan.id,
    planName: plan.name,
    cycle: plan.cycle,
    productId: plan.product.id,
    productName: plan.product.name,
    prices: plan.prices.map((price) => ({
      priceId: price.id,
      amount: price.amount,
      currency: price.currency,
      active: price.active,
    })),
  }));

  const jobPrices = await prisma.price.findMany({
    where: {
      active: true,
      currency: "IRR",
      product: {
        active: true,
        type: ProductType.JOB_POST,
      },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      amount: "asc",
    },
  });

  const jobPost = jobPrices.map((price) => ({
    priceId: price.id,
    productId: price.product?.id ?? price.productId ?? "",
    productName: price.product?.name ?? "",
    amount: price.amount,
    currency: price.currency,
    active: price.active,
  }));

  return NextResponse.json(
    {
      subscriptions,
      jobPost,
    },
    { headers: CACHE_HEADERS },
  );
}
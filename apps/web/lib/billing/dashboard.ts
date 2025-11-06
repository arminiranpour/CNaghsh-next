import "server-only";

import { EntitlementKey } from "@prisma/client";

import type { ProviderName } from "@/lib/billing/provider.types";
import { startCheckoutSession } from "@/lib/billing/checkout";
import { prisma } from "@/lib/prisma";

import type {
  BillingDashboardData,
  BillingEntitlements,
  BillingInvoice,
  BillingPayment,
  BillingSubscription,
} from "./dashboard.types";

const selectActivePrice = (prices: Array<{ id: string; amount: number; currency: string }>): {
  id: string;
  amount: number;
  currency: string;
} | null => {
  if (prices.length === 0) {
    return null;
  }

  const [first] = prices;
  return first ?? null;
};

export async function getBillingDashboardData(
  userId: string,
): Promise<BillingDashboardData> {
  const now = new Date();

  const [subscription, entitlement, payments, invoices] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            cycle: true,
            prices: {
              where: { active: true },
              orderBy: { amount: "asc" },
              select: { id: true, amount: true, currency: true },
              take: 3,
            },
          },
        },
      },
    }),
    prisma.userEntitlement.findFirst({
      where: { userId, key: EntitlementKey.CAN_PUBLISH_PROFILE },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        invoice: { select: { id: true, number: true } },
      },
    }),
    prisma.invoice.findMany({
      where: { userId },
      orderBy: { issuedAt: "desc" },
      take: 50,
      include: {
        payment: {
          select: {
            provider: true,
            providerRef: true,
            status: true,
          },
        },
      },
    }),
  ]);

  const subscriptionPayload: BillingSubscription | null = subscription
    ? {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        startedAt: subscription.startedAt.toISOString(),
        endsAt: subscription.endsAt.toISOString(),
        renewalAt: subscription.renewalAt
          ? subscription.renewalAt.toISOString()
          : null,
        providerRef: subscription.providerRef ?? null,
        plan: {
          id: subscription.plan.id,
          name: subscription.plan.name,
          cycle: subscription.plan.cycle,
          activePrice: selectActivePrice(subscription.plan.prices ?? []),
        },
      }
    : null;

  const entitlements: BillingEntitlements = {
    canPublishProfile: {
      active:
        !!entitlement?.expiresAt &&
        new Date(entitlement.expiresAt).getTime() > now.getTime(),
      expiresAt: entitlement?.expiresAt
        ? entitlement.expiresAt.toISOString()
        : null,
      updatedAt: entitlement?.updatedAt
        ? entitlement.updatedAt.toISOString()
        : null,
    },
  };

  const paymentPayload: BillingPayment[] = payments.map((payment) => ({
    id: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    provider: payment.provider,
    providerRef: payment.providerRef,
    createdAt: payment.createdAt.toISOString(),
    invoice: payment.invoice
      ? { id: payment.invoice.id, number: payment.invoice.number }
      : null,
  }));

  const invoicePayload: BillingInvoice[] = invoices.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    total: invoice.total,
    currency: invoice.currency,
    issuedAt: invoice.issuedAt.toISOString(),
    provider: invoice.payment?.provider ?? null,
    providerRef: invoice.payment?.providerRef ?? null,
    paymentStatus: invoice.payment?.status ?? null,
    pdfUrl: null,
  }));

  const latestFailedPayment =
    paymentPayload.find((item) => item.status === "FAILED") ?? null;

  return {
    userId,
    now: now.toISOString(),
    subscription: subscriptionPayload,
    entitlements,
    payments: paymentPayload,
    invoices: invoicePayload,
    latestFailedPayment,
  };
}

export async function startRenewalCheckout({
  userId,
  provider,
  returnUrl,
}: {
  userId: string;
  provider: ProviderName;
  returnUrl?: string;
}) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          cycle: true,
          prices: {
            where: { active: true },
            orderBy: { amount: "asc" },
            select: { id: true, amount: true, currency: true },
            take: 3,
          },
        },
      },
    },
  });

  if (!subscription) {
    throw new Error("SUBSCRIPTION_NOT_FOUND");
  }

  const activePrice = selectActivePrice(subscription.plan.prices ?? []);

  if (!activePrice) {
    throw new Error("ACTIVE_PRICE_NOT_FOUND");
  }

  return startCheckoutSession({
    userId,
    priceId: activePrice.id,
    provider,
    returnUrl,
  });
}

export type {
  BillingDashboardData,
  BillingEntitlements,
  BillingInvoice,
  BillingPayment,
  BillingSubscription,
  BillingSubscriptionPlan,
} from "./dashboard.types";

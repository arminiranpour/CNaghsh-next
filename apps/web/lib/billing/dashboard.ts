import {
  EntitlementKey,
  InvoiceStatus,
  PaymentStatus,
  PlanCycle,
  SubscriptionStatus,
} from "@prisma/client";

import type { ProviderName } from "@/lib/billing/providerAdapters/types";
import { startCheckoutSession } from "@/lib/billing/checkout";
import { prisma } from "@/lib/prisma";

export type BillingSubscriptionPlan = {
  id: string;
  name: string;
  cycle: PlanCycle;
  activePrice: { id: string; amount: number; currency: string } | null;
};

export type BillingSubscription = {
  id: string;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  startedAt: string;
  endsAt: string;
  renewalAt: string | null;
  providerRef: string | null;
  plan: BillingSubscriptionPlan;
};

export type BillingEntitlements = {
  canPublishProfile: {
    active: boolean;
    expiresAt: string | null;
    updatedAt: string | null;
  };
};

export type BillingPayment = {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerRef: string;
  createdAt: string;
  invoice: { id: string; number: string } | null;
};

export type BillingInvoice = {
  id: string;
  number: string;
  status: InvoiceStatus;
  total: number;
  currency: string;
  issuedAt: string;
  provider: string | null;
  providerRef: string | null;
  paymentStatus: PaymentStatus | null;
  pdfUrl: string | null;
};

export type BillingDashboardData = {
  userId: string;
  now: string;
  subscription: BillingSubscription | null;
  entitlements: BillingEntitlements;
  payments: BillingPayment[];
  invoices: BillingInvoice[];
  latestFailedPayment: BillingPayment | null;
};

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
    paymentPayload.find((item) => item.status === PaymentStatus.FAILED) ?? null;

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

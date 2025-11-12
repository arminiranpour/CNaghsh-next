import {
  EntitlementKey,
  NotificationChannel,
  NotificationDispatchStatus,
  NotificationType,
  Prisma,
  type InvoiceStatus,
  type InvoiceType,
  type PaymentStatus,
  type Provider,
  type SubscriptionStatus,
} from "@prisma/client";

type ExtendedPaymentStatus = PaymentStatus | "REFUNDED_PARTIAL";

import { prisma } from "@/lib/db";

const DEFAULT_PAGE_SIZE = 25;

type Pagination = { page?: number; pageSize?: number };

type SortDirection = "asc" | "desc";

type SubscriptionSortField = "createdAt" | "startedAt" | "endsAt" | "renewalAt" | "status" | "plan";

type SubscriptionFilters = {
  status?: SubscriptionStatus;
  planId?: string;
  provider?: Provider;
  cancelAtPeriodEnd?: boolean;
  startedFrom?: Date;
  startedTo?: Date;
  endsFrom?: Date;
  endsTo?: Date;
  query?: string;
};

type SubscriptionListArgs = {
  filters: SubscriptionFilters;
  pagination?: Pagination;
  sort?: { field: SubscriptionSortField; direction: SortDirection };
};

export async function listSubscriptions({ filters, pagination, sort }: SubscriptionListArgs) {
  const page = pagination?.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize = pagination?.pageSize && pagination.pageSize > 0 ? pagination.pageSize : DEFAULT_PAGE_SIZE;

  const where: Prisma.SubscriptionWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.planId) {
    where.planId = filters.planId;
  }

  if (typeof filters.cancelAtPeriodEnd === "boolean") {
    where.cancelAtPeriodEnd = filters.cancelAtPeriodEnd;
  }

  if (filters.startedFrom || filters.startedTo) {
    where.startedAt = {};
    if (filters.startedFrom) {
      where.startedAt.gte = filters.startedFrom;
    }
    if (filters.startedTo) {
      where.startedAt.lte = filters.startedTo;
    }
  }

  if (filters.endsFrom || filters.endsTo) {
    where.endsAt = {};
    if (filters.endsFrom) {
      where.endsAt.gte = filters.endsFrom;
    }
    if (filters.endsTo) {
      where.endsAt.lte = filters.endsTo;
    }
  }

  if (filters.provider) {
    where.user = {
      payments: {
        some: {
          provider: filters.provider,
        },
      },
    };
  }

  if (filters.query) {
    const query = filters.query.trim();
    if (query) {
      where.OR = [
        { providerRef: { contains: query, mode: "insensitive" } },
        { user: { email: { contains: query, mode: "insensitive" } } },
      ];
    }
  }

  const orderBy: Prisma.SubscriptionOrderByWithRelationInput[] = [];
  if (sort) {
    if (sort.field === "plan") {
      orderBy.push({ plan: { name: sort.direction } });
    } else {
      orderBy.push({ [sort.field]: sort.direction } as Prisma.SubscriptionOrderByWithRelationInput);
    }
  }
  orderBy.push({ createdAt: "desc" });

  const [total, subscriptions] = await Promise.all([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      include: {
        plan: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const userIds = Array.from(new Set(subscriptions.map((item) => item.userId)));
  const payments = await prisma.payment.findMany({
    where: { userId: { in: userIds } },
    select: {
      id: true,
      userId: true,
      provider: true,
      providerRef: true,
      amount: true,
      currency: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const latestPaymentByUser = new Map<string, (typeof payments)[number]>();
  for (const payment of payments) {
    if (!latestPaymentByUser.has(payment.userId)) {
      latestPaymentByUser.set(payment.userId, payment);
    }
  }

  const items = subscriptions.map((subscription) => ({
    ...subscription,
    latestPayment: subscription.userId ? latestPaymentByUser.get(subscription.userId) ?? null : null,
  }));

  return { items, total, page, pageSize };
}

type PaymentSortField = "createdAt" | "amount" | "status";

type PaymentFilters = {
  status?: ExtendedPaymentStatus;
  provider?: Provider;
  from?: Date;
  to?: Date;
  minAmount?: number;
  maxAmount?: number;
  query?: string;
};

type PaymentListArgs = {
  filters: PaymentFilters;
  pagination?: Pagination;
  sort?: { field: PaymentSortField; direction: SortDirection };
};

export async function listPayments({ filters, pagination, sort }: PaymentListArgs) {
  const page = pagination?.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize = pagination?.pageSize && pagination.pageSize > 0 ? pagination.pageSize : DEFAULT_PAGE_SIZE;

  const where: Prisma.PaymentWhereInput = {};

  if (filters.status) {
    where.status = filters.status as PaymentStatus;
  }

  if (filters.provider) {
    where.provider = filters.provider;
  }

  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) {
      where.createdAt.gte = filters.from;
    }
    if (filters.to) {
      where.createdAt.lte = filters.to;
    }
  }

  if (typeof filters.minAmount === "number" || typeof filters.maxAmount === "number") {
    where.amount = {};
    if (typeof filters.minAmount === "number") {
      where.amount.gte = filters.minAmount;
    }
    if (typeof filters.maxAmount === "number") {
      where.amount.lte = filters.maxAmount;
    }
  }

  if (filters.query) {
    const query = filters.query.trim();
    if (query) {
      where.OR = [
        { providerRef: { contains: query, mode: "insensitive" } },
        { user: { email: { contains: query, mode: "insensitive" } } },
      ];
    }
  }

  const orderBy: Prisma.PaymentOrderByWithRelationInput[] = [];
  if (sort) {
    orderBy.push({ [sort.field]: sort.direction } as Prisma.PaymentOrderByWithRelationInput);
  }
  orderBy.push({ createdAt: "desc" });

  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true } },
        invoice: { include: { refunds: { select: { id: true, total: true } } } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items = payments.map((payment) => {
    const extendedPayment = payment as typeof payment & { refundedAmount?: number };
    const refundedAmount = extendedPayment.refundedAmount ?? 0;

    const invoiceWithRefunds = payment.invoice
      ? {
          ...payment.invoice,
          refunds: payment.invoice.refunds ?? [],
        }
      : null;

    return {
      ...payment,
      refundedAmount,
      invoice: invoiceWithRefunds,
    };
  });

  return { items, total, page, pageSize };
}

type InvoiceSortField = "issuedAt" | "total" | "status";

type InvoiceFilters = {
  status?: InvoiceStatus;
  type?: InvoiceType;
  from?: Date;
  to?: Date;
  minAmount?: number;
  maxAmount?: number;
  query?: string;
};

type InvoiceListArgs = {
  filters: InvoiceFilters;
  pagination?: Pagination;
  sort?: { field: InvoiceSortField; direction: SortDirection };
};

export async function listInvoices({ filters, pagination, sort }: InvoiceListArgs) {
  const page = pagination?.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize = pagination?.pageSize && pagination.pageSize > 0 ? pagination.pageSize : DEFAULT_PAGE_SIZE;

  const where: Prisma.InvoiceWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.from || filters.to) {
    where.issuedAt = {};
    if (filters.from) {
      where.issuedAt.gte = filters.from;
    }
    if (filters.to) {
      where.issuedAt.lte = filters.to;
    }
  }

  if (typeof filters.minAmount === "number" || typeof filters.maxAmount === "number") {
    where.total = {};
    if (typeof filters.minAmount === "number") {
      where.total.gte = filters.minAmount;
    }
    if (typeof filters.maxAmount === "number") {
      where.total.lte = filters.maxAmount;
    }
  }

  if (filters.query) {
    const query = filters.query.trim();
    if (query) {
      where.OR = [
        { number: { contains: query, mode: "insensitive" } },
        { providerRef: { contains: query, mode: "insensitive" } },
        { user: { email: { contains: query, mode: "insensitive" } } },
      ];
    }
  }

  const orderBy: Prisma.InvoiceOrderByWithRelationInput[] = [];
  if (sort) {
    orderBy.push({ [sort.field]: sort.direction } as Prisma.InvoiceOrderByWithRelationInput);
  }
  orderBy.push({ issuedAt: "desc" });

  const [total, invoices] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true } },
        payment: { select: { id: true, provider: true, providerRef: true } },
        relatedInvoice: { select: { id: true, number: true, type: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { items: invoices, total, page, pageSize };
}

type EntitlementSortField = "updatedAt" | "expiresAt";

type EntitlementFilters = {
  key?: string;
  active?: boolean;
  from?: Date;
  to?: Date;
  query?: string;
};

type EntitlementListArgs = {
  filters: EntitlementFilters;
  pagination?: Pagination;
  sort?: { field: EntitlementSortField; direction: SortDirection };
};

const ENTITLEMENT_KEYS = new Set<EntitlementKey>(Object.values(EntitlementKey));

const isEntitlementKey = (value: string): value is EntitlementKey => {
  return ENTITLEMENT_KEYS.has(value as EntitlementKey);
};

export async function listEntitlements({ filters, pagination, sort }: EntitlementListArgs) {
  const page = pagination?.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize = pagination?.pageSize && pagination.pageSize > 0 ? pagination.pageSize : DEFAULT_PAGE_SIZE;

  const where: Prisma.UserEntitlementWhereInput = {};

  if (filters.key) {
    if (isEntitlementKey(filters.key)) {
      where.key = filters.key;
    }
  }

  if (typeof filters.active === "boolean") {
    if (filters.active) {
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];
    } else {
      where.expiresAt = { lte: new Date() };
    }
  }

  if (filters.from || filters.to) {
    where.updatedAt = {};
    if (filters.from) {
      where.updatedAt.gte = filters.from;
    }
    if (filters.to) {
      where.updatedAt.lte = filters.to;
    }
  }

  if (filters.query) {
    const query = filters.query.trim();
    if (query) {
      where.user = { email: { contains: query, mode: "insensitive" } };
    }
  }

  const orderBy: Prisma.UserEntitlementOrderByWithRelationInput[] = [];
  if (sort) {
    orderBy.push({ [sort.field]: sort.direction } as Prisma.UserEntitlementOrderByWithRelationInput);
  }
  orderBy.push({ updatedAt: "desc" });

  const [total, entitlements] = await Promise.all([
    prisma.userEntitlement.count({ where }),
    prisma.userEntitlement.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { items: entitlements, total, page, pageSize };
}

type NotificationLogSortField = "createdAt" | "status" | "channel" | "attempts";

type NotificationLogFilters = {
  channel?: NotificationChannel;
  status?: NotificationDispatchStatus;
  type?: NotificationType;
  from?: Date;
  to?: Date;
  query?: string;
};

type NotificationLogListArgs = {
  filters: NotificationLogFilters;
  pagination?: Pagination;
  sort?: { field: NotificationLogSortField; direction: SortDirection };
};

export async function listNotificationLogs({
  filters,
  pagination,
  sort,
}: NotificationLogListArgs) {
  const page = pagination?.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize = pagination?.pageSize && pagination.pageSize > 0 ? pagination.pageSize : DEFAULT_PAGE_SIZE;

  const where: Prisma.NotificationMessageLogWhereInput = {};

  if (filters.channel) {
    where.channel = filters.channel;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.type) {
    where.eventType = filters.type;
  }

  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) {
      where.createdAt.gte = filters.from;
    }
    if (filters.to) {
      where.createdAt.lte = filters.to;
    }
  }

  if (filters.query) {
    const query = filters.query.trim();
    if (query) {
      where.OR = [
        { dedupeKey: { contains: query, mode: "insensitive" } },
        { eventType: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { providerMessageId: { contains: query, mode: "insensitive" } },
        { user: { email: { contains: query, mode: "insensitive" } } },
      ];
    }
  }

  const orderBy: Prisma.NotificationMessageLogOrderByWithRelationInput[] = [];
  if (sort) {
    if (sort.field === "attempts") {
      orderBy.push({ attempts: sort.direction });
    } else {
      orderBy.push({ [sort.field]: sort.direction } as Prisma.NotificationMessageLogOrderByWithRelationInput);
    }
  }
  orderBy.push({ createdAt: "desc" });

  const [total, logs] = await Promise.all([
    prisma.notificationMessageLog.count({ where }),
    prisma.notificationMessageLog.findMany({
      where,
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { items: logs, total, page, pageSize };
}

type WebhookSortField = "receivedAt" | "status";

type WebhookFilters = {
  provider?: string;
  status?: string;
  from?: Date;
  to?: Date;
  idempotencyKey?: string;
};

type WebhookListArgs = {
  filters: WebhookFilters;
  pagination?: Pagination;
  sort?: { field: WebhookSortField; direction: SortDirection };
};

export async function listWebhookLogs({ filters, pagination, sort }: WebhookListArgs) {
  const page = pagination?.page && pagination.page > 0 ? pagination.page : 1;
  const pageSize = pagination?.pageSize && pagination.pageSize > 0 ? pagination.pageSize : DEFAULT_PAGE_SIZE;

  const where: Prisma.PaymentWebhookLogWhereInput = {};

  if (filters.provider) {
    where.provider = filters.provider;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.idempotencyKey) {
    where.externalId = { contains: filters.idempotencyKey, mode: "insensitive" };
  }

  if (filters.from || filters.to) {
    where.receivedAt = {};
    if (filters.from) {
      where.receivedAt.gte = filters.from;
    }
    if (filters.to) {
      where.receivedAt.lte = filters.to;
    }
  }

  const orderBy: Prisma.PaymentWebhookLogOrderByWithRelationInput[] = [];
  if (sort) {
    orderBy.push({ [sort.field]: sort.direction } as Prisma.PaymentWebhookLogOrderByWithRelationInput);
  }
  orderBy.push({ receivedAt: "desc" });

  const [total, logs] = await Promise.all([
    prisma.paymentWebhookLog.count({ where }),
    prisma.paymentWebhookLog.findMany({
      where,
      include: { payment: { select: { id: true, provider: true, providerRef: true } } },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { items: logs, total, page, pageSize };
}

export async function getBillingOverview(now = new Date()) {
  const [activeSubscriptions, expiringSoon, failedPayments, refunds] = await Promise.all([
    prisma.subscription.count({ where: { status: "active" } }),
    prisma.subscription.count({
      where: {
        status: { in: ["active", "renewing"] },
        endsAt: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.payment.count({
      where: {
        status: "FAILED",
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.payment.count({
      where: {
        status: "REFUNDED",
        updatedAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return {
    activeSubscriptions,
    expiringSoon,
    failedPayments,
    refunds,
  };
}

import { Prisma, SubscriptionStatus, PaymentStatus, Provider, InvoiceStatus, InvoiceType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 20;

type PaginationInput = {
  page?: number | null;
  pageSize?: number | null;
};

type PageInfo = {
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

function resolvePagination({ page, pageSize }: PaginationInput): {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
} {
  const safePageSize = pageSize && pageSize > 0 && pageSize <= 100 ? pageSize : DEFAULT_PAGE_SIZE;
  const safePage = page && page > 0 ? page : 1;
  const take = safePageSize + 1;
  const skip = (safePage - 1) * safePageSize;
  return { skip, take, page: safePage, pageSize: safePageSize };
}

export type ListSubscriptionsArgs = {
  q?: string | null;
  status?: SubscriptionStatus | null;
  planId?: string | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
} & PaginationInput;

export async function listSubscriptions({
  q,
  status,
  planId,
  dateFrom,
  dateTo,
  ...pagination
}: ListSubscriptionsArgs) {
  const { skip, take, page, pageSize } = resolvePagination(pagination);

  const where: Prisma.SubscriptionWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (planId) {
    where.planId = planId;
  }

  if (dateFrom || dateTo) {
    where.updatedAt = {};
    if (dateFrom) {
      where.updatedAt.gte = dateFrom;
    }
    if (dateTo) {
      where.updatedAt.lte = dateTo;
    }
  }

  if (q) {
    const trimmed = q.trim();
    if (trimmed.length > 0) {
      where.OR = [
        { providerRef: { contains: trimmed, mode: "insensitive" } },
        {
          user: {
            email: { contains: trimmed, mode: "insensitive" },
          },
        },
      ];
    }
  }

  const results = await prisma.subscription.findMany({
    where,
    include: {
      plan: { select: { id: true, name: true } },
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          entitlements: {
            where: { key: "CAN_PUBLISH_PROFILE" },
            orderBy: { expiresAt: "desc" },
            take: 1,
            select: {
              id: true,
              key: true,
              expiresAt: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    skip,
    take,
  });

  const hasNextPage = results.length > pageSize;
  const rows = hasNextPage ? results.slice(0, pageSize) : results;
  const hasPreviousPage = page > 1;

  return {
    rows,
    pageInfo: { page, pageSize, hasNextPage, hasPreviousPage } satisfies PageInfo,
  };
}

export type ListPaymentsArgs = {
  q?: string | null;
  provider?: Provider | null;
  status?: PaymentStatus | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
} & PaginationInput;

export async function listPayments({ q, provider, status, dateFrom, dateTo, ...pagination }: ListPaymentsArgs) {
  const { skip, take, page, pageSize } = resolvePagination(pagination);

  const where: Prisma.PaymentWhereInput = {};

  if (provider) {
    where.provider = provider;
  }

  if (status) {
    where.status = status;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = dateFrom;
    }
    if (dateTo) {
      where.createdAt.lte = dateTo;
    }
  }

  if (q) {
    const trimmed = q.trim();
    if (trimmed.length > 0) {
      where.OR = [
        { providerRef: { contains: trimmed, mode: "insensitive" } },
        {
          user: {
            email: { contains: trimmed, mode: "insensitive" },
          },
        },
      ];
    }
  }

  const results = await prisma.payment.findMany({
    where,
    include: {
      user: { select: { id: true, email: true, name: true } },
      invoice: {
        select: {
          id: true,
          number: true,
          type: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

  const hasNextPage = results.length > pageSize;
  const rows = hasNextPage ? results.slice(0, pageSize) : results;
  const hasPreviousPage = page > 1;

  return {
    rows,
    pageInfo: { page, pageSize, hasNextPage, hasPreviousPage } satisfies PageInfo,
  };
}

export type ListInvoicesArgs = {
  q?: string | null;
  type?: InvoiceType | null;
  status?: InvoiceStatus | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
} & PaginationInput;

export async function listInvoices({ q, type, status, dateFrom, dateTo, ...pagination }: ListInvoicesArgs) {
  const { skip, take, page, pageSize } = resolvePagination(pagination);

  const where: Prisma.InvoiceWhereInput = {};

  if (type) {
    where.type = type;
  }

  if (status) {
    where.status = status;
  }

  if (dateFrom || dateTo) {
    where.issuedAt = {};
    if (dateFrom) {
      where.issuedAt.gte = dateFrom;
    }
    if (dateTo) {
      where.issuedAt.lte = dateTo;
    }
  }

  if (q) {
    const trimmed = q.trim();
    if (trimmed.length > 0) {
      where.OR = [
        { number: { contains: trimmed, mode: "insensitive" } },
        { providerRef: { contains: trimmed, mode: "insensitive" } },
        {
          user: {
            email: { contains: trimmed, mode: "insensitive" },
          },
        },
      ];
    }
  }

  const results = await prisma.invoice.findMany({
    where,
    include: {
      user: { select: { id: true, email: true, name: true } },
      payment: {
        select: {
          id: true,
          provider: true,
          providerRef: true,
        },
      },
    },
    orderBy: { issuedAt: "desc" },
    skip,
    take,
  });

  const hasNextPage = results.length > pageSize;
  const rows = hasNextPage ? results.slice(0, pageSize) : results;
  const hasPreviousPage = page > 1;

  return {
    rows,
    pageInfo: { page, pageSize, hasNextPage, hasPreviousPage } satisfies PageInfo,
  };
}

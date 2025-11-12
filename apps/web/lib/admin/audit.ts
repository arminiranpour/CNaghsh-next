import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

import type { AdminSessionUser } from "./auth";

export type AuditResourceType =
  | "subscription"
  | "payment"
  | "invoice"
  | "entitlement"
  | "webhook"
  | "export"
  | "system";

export type AuditLogInput = {
  actor: AdminSessionUser;
  resource: { type: AuditResourceType; id: string };
  action: string;
  reason: string;
  before?: Prisma.JsonValue;
  after?: Prisma.JsonValue;
  metadata?: Prisma.JsonValue;
  idempotencyKey?: string | null;
  request?: { ip?: string | null; userAgent?: string | null };
};

export async function recordAuditLog(input: AuditLogInput) {
  const reason = input.reason.trim();
  if (!reason) {
    throw new Error("ثبت دلیل برای عملیات الزامی است.");
  }

  const idempotencyKey = input.idempotencyKey?.trim() || undefined;

  await prisma.auditLog.create({
    data: {
      actorId: input.actor.id,
      actorEmail: input.actor.email ?? null,
      resourceType: input.resource.type,
      resourceId: input.resource.id,
      action: input.action,
      reason,
      before: input.before ?? Prisma.DbNull,
      after: input.after ?? Prisma.DbNull,
      metadata: input.metadata ?? Prisma.DbNull,
      idempotencyKey,
      ipAddress: input.request?.ip ?? null,
      userAgent: input.request?.userAgent ?? null,
    },
  });
}

export async function listAuditLogs(
  filters: {
    actorId?: string;
    resourceType?: AuditResourceType;
    from?: Date;
    to?: Date;
    page: number;
    pageSize: number;
  },
) {
  const where: Prisma.AuditLogWhereInput = {};

  if (filters.actorId) {
    where.actorId = filters.actorId;
  }

  if (filters.resourceType) {
    where.resourceType = filters.resourceType;
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

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      include: { actor: { select: { id: true, email: true, name: true } } },
    }),
  ]);

  return { total, items };
}

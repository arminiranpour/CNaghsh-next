import { NextRequest } from "next/server";
import { InvoiceStatus, InvoiceType } from "@prisma/client";

import { getServerAuthSession } from "@/lib/auth/session";
import { unauthorized } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const TYPE_VALUES = new Set<InvoiceType>(["SALE", "REFUND"]);
const STATUS_VALUES = new Set<InvoiceStatus>(["PAID", "OPEN", "VOID"]);

function getQueryParam(request: NextRequest, key: string): string | undefined {
  const value = request.nextUrl.searchParams.get(key);
  return value ?? undefined;
}

async function ensureAdmin(request: NextRequest) {
  const session = await getServerAuthSession();
  if (session?.user && session.user.role === "ADMIN") {
    return session.user;
  }

  const adminId = request.headers.get("x-admin-user-id");
  if (adminId) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, role: true },
    });
    if (admin?.role === "ADMIN") {
      return admin;
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const admin = await ensureAdmin(request);
  if (!admin) {
    return unauthorized("Admin required");
  }

  const q = getQueryParam(request, "q") ?? undefined;
  const typeRaw = getQueryParam(request, "type") ?? undefined;
  const statusRaw = getQueryParam(request, "status") ?? undefined;
  const dateFromRaw = getQueryParam(request, "dateFrom") ?? undefined;
  const dateToRaw = getQueryParam(request, "dateTo") ?? undefined;

  const where: Parameters<typeof prisma.invoice.findMany>[0]["where"] = {};

  if (q && q.trim()) {
    const trimmed = q.trim();
    where.OR = [
      { number: { contains: trimmed, mode: "insensitive" } },
      { providerRef: { contains: trimmed, mode: "insensitive" } },
      { user: { email: { contains: trimmed, mode: "insensitive" } } },
    ];
  }

  if (typeRaw && TYPE_VALUES.has(typeRaw as InvoiceType)) {
    where.type = typeRaw as InvoiceType;
  }

  if (statusRaw && STATUS_VALUES.has(statusRaw as InvoiceStatus)) {
    where.status = statusRaw as InvoiceStatus;
  }

  if (dateFromRaw || dateToRaw) {
    where.issuedAt = {};
    if (dateFromRaw) {
      const parsed = new Date(dateFromRaw);
      if (!Number.isNaN(parsed.getTime())) {
        where.issuedAt.gte = parsed;
      }
    }
    if (dateToRaw) {
      const parsed = new Date(dateToRaw);
      if (!Number.isNaN(parsed.getTime())) {
        where.issuedAt.lte = parsed;
      }
    }
  }

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { issuedAt: "desc" },
    include: {
      user: { select: { email: true } },
    },
  });

  const header = "number,userEmail,type,total,currency,issuedAt,status,providerRef";
  const rows = invoices.map((invoice) => {
    const issuedAt = invoice.issuedAt.toISOString();
    return [
      invoice.number,
      invoice.user.email ?? "",
      invoice.type,
      invoice.total.toString(),
      invoice.currency,
      issuedAt,
      invoice.status,
      invoice.providerRef ?? "",
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(",");
  });

  const csv = [header, ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"invoices.csv\"",
      "Cache-Control": "no-store",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const limitParam = searchParams.get("limit");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const limit = limitParam ? Number.parseInt(limitParam, 10) : 10;

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return NextResponse.json({ error: "Invalid limit" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const invoices = await prisma.invoice.findMany({
    where: { userId },
    include: {
      payment: {
        select: {
          id: true,
          provider: true,
          providerRef: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(
    {
      userId,
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.number ?? null,
        status: invoice.status,
        total: invoice.total,
        currency: invoice.currency,
        issuedAt: invoice.issuedAt.toISOString(),
        createdAt: invoice.createdAt.toISOString(),
        payment: invoice.payment
          ? {
              id: invoice.payment.id,
              provider: invoice.payment.provider,
              providerRef: invoice.payment.providerRef,
              status: invoice.payment.status,
            }
          : null,
      })),
    },
    { headers: NO_STORE_HEADERS },
  );
}
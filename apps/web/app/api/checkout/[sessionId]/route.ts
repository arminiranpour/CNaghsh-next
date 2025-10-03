import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

type Params = {
  params: {
    sessionId: string;
  };
};

export async function GET(_request: NextRequest, { params }: Params) {
  const { sessionId } = params;

  const session = await prisma.checkoutSession.findUnique({
    where: { id: sessionId },
    include: {
      price: {
        select: {
          amount: true,
          currency: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          invoice: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const payment = session.payments[0];

  return NextResponse.json(
    {
      sessionId: session.id,
      status: session.status,
      invoiceId: payment?.invoice?.id ?? null,
      paymentId: payment?.id ?? null,
      provider: session.provider,
      amount: session.price.amount,
      currency: session.price.currency,
    },
    { headers: NO_STORE_HEADERS },
  );
}
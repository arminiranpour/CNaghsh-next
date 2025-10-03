import { NextRequest, NextResponse } from "next/server";

import { ProductType } from "@prisma/client";

import { ProviderName } from "@/lib/billing/providers/types";
import { prisma } from "@/lib/db";
import { CheckoutStatus, InvoiceStatus, PaymentStatus, Provider } from "@/lib/prismaEnums";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

const isProviderName = (value: string): value is ProviderName => {
  return value === "zarinpal" || value === "idpay" || value === "nextpay";
};

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const { userId, provider, priceId } = body as Record<string, unknown>;

  if (typeof userId !== "string" || typeof provider !== "string" || typeof priceId !== "string") {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  if (!isProviderName(provider)) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const price = await prisma.price.findUnique({
    where: { id: priceId },
    include: {
      plan: {
        include: {
          product: {
            select: { id: true, type: true, active: true },
          },
        },
      },
      product: {
        select: { id: true, type: true, active: true },
      },
    },
  });

  const priceIsActive =
    price?.active &&
    price.currency === "IRR" &&
    ((price.planId &&
      price.plan?.active &&
      price.plan.product?.active &&
      price.plan.product.type === ProductType.SUBSCRIPTION) ||
      (price.productId && price.product?.active && price.product.type === ProductType.JOB_POST));

  if (!price || !priceIsActive) {
    return NextResponse.json({ error: "PRICE_NOT_AVAILABLE" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const baseUrl = process.env.PUBLIC_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "Missing PUBLIC_BASE_URL" }, { status: 400, headers: NO_STORE_HEADERS });
  }
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.checkoutSession.create({
        data: {
          userId,
          provider: provider as Provider,
          priceId: price.id,
          status: CheckoutStatus.STARTED,
          redirectUrl: "",
          returnUrl: "",
          providerInitPayload: {},
        },
      });

      const payment = await tx.payment.create({
        data: {
          userId,
          checkoutSessionId: session.id,
          provider: provider as Provider,
          providerRef: `sandbox-${session.id}`,
          amount: price.amount,
          currency: price.currency,
          status: PaymentStatus.PENDING,
        },
      });

      await tx.invoice.create({
        data: {
          userId,
          paymentId: payment.id,
          total: price.amount,
          currency: price.currency,
          status: InvoiceStatus.OPEN,
        },
      });

      const returnUrl = `${baseUrl}/checkout/${session.id}/success`;
      const params = new URLSearchParams({
        session: session.id,
        provider,
        amount: String(price.amount),
        currency: price.currency,
        returnUrl,
      });

       const redirectUrl = `${baseUrl}/billing/sandbox-redirect?${params.toString()}`;

      await tx.checkoutSession.update({
        where: { id: session.id },
        data: {
          redirectUrl,
          returnUrl,
          status: CheckoutStatus.PENDING,
        },
      });

      return { sessionId: session.id, redirectUrl };
    });
    return NextResponse.json(result, { status: 201, headers: NO_STORE_HEADERS });

  } catch (error) {
    console.error("checkout/start", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: NO_STORE_HEADERS });  }
}
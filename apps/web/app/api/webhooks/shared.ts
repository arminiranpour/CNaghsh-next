import { NextRequest, NextResponse } from "next/server";

import type { Prisma } from "@prisma/client";

import { applyEntitlements } from "@/lib/billing/entitlements";
import { verifySignature } from "@/lib/billing/verifySignature";
import { prisma } from "@/lib/db";
import { CheckoutStatus, InvoiceStatus, PaymentStatus } from "@/lib/prismaEnums";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

type ProviderName = "zarinpal" | "idpay" | "nextpay";

type WebhookResponse = NextResponse<{ error: string } | { ok: true; status: "PAID" | "FAILED" }>;

export const handleWebhook = async (
  request: NextRequest,
  providerName: ProviderName,
): Promise<WebhookResponse> => {
  const signature = request.headers.get("x-webhook-signature");

  if (!verifySignature(signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401, headers: NO_STORE_HEADERS });
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
  }
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const data = payload as Record<string, unknown>;
  const sessionId = data.sessionId;
  const providerRef = data.providerRef;
  const status = data.status;

  if (
    typeof sessionId !== "string" ||
    !sessionId ||
    typeof providerRef !== "string" ||
    !providerRef ||
    (status !== "OK" && status !== "FAILED")
  ) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const session = await prisma.checkoutSession.findUnique({
    where: { id: sessionId },
    include: {
      price: {
        select: {
          id: true,
          amount: true,
          currency: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          invoice: true,
        },
      },
    },
  });
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }
  if (session.provider !== providerName) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const payment = session.payments[0];

  if (!payment || !payment.invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  if (payment.status === PaymentStatus.PAID) {
    return NextResponse.json({ ok: true, status: "PAID" }, { headers: NO_STORE_HEADERS });
  }

  if (payment.status === PaymentStatus.FAILED) {
    return NextResponse.json({ ok: true, status: "FAILED" }, { headers: NO_STORE_HEADERS });
  }

  const payloadJson = payload as Prisma.InputJsonValue;

  if (status === "OK") {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          providerRef,
          amount: session.price.amount,
          currency: session.price.currency,
        },
      });

      await tx.invoice.update({
        where: { id: payment.invoice!.id },
        data: {
          status: InvoiceStatus.PAID,
          total: session.price.amount,
          currency: session.price.currency,
        },
      });

      await tx.checkoutSession.update({
        where: { id: session.id },
        data: {
          status: CheckoutStatus.SUCCESS,
          providerCallbackPayload: payloadJson,
        },
      });
    });

    await applyEntitlements({
      userId: session.userId,
      priceId: session.price.id,
      paymentId: payment.id,
    });

    return NextResponse.json({ ok: true, status: "PAID" }, { headers: NO_STORE_HEADERS });
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        providerRef,
      },
    });

    await tx.invoice.update({
      where: { id: payment.invoice!.id },
      data: {
        status: InvoiceStatus.VOID,
      },
    });

    await tx.checkoutSession.update({
      where: { id: session.id },
      data: {
        status: CheckoutStatus.FAILED,
        providerCallbackPayload: payloadJson,
      },
    });
  });
  return NextResponse.json({ ok: true, status: "FAILED" }, { headers: NO_STORE_HEADERS });
};
import { NextRequest, NextResponse } from "next/server";

import { applyEntitlements } from "@/lib/billing/entitlements";
import { providers } from "@/lib/billing/providers";
import { ProviderName } from "@/lib/billing/providers/types";
import { verifySignature } from "@/lib/billing/verifySignature";
import { prisma } from "@/lib/db";
import { CheckoutStatus, InvoiceStatus, PaymentStatus } from "@/lib/prismaEnums";


type WebhookResponse = NextResponse<{ error: string } | { ok: true; status: "PAID" | "FAILED" }>;

export const handleWebhook = async (
  request: NextRequest,
  providerName: ProviderName,
): Promise<WebhookResponse> => {
  const signature = request.headers.get("x-webhook-signature");
  if (!verifySignature(signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const payloadData = payload as Record<string, unknown>;
  const sessionId = payloadData.sessionId;
  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }
  const adapter = providers[providerName];
  const parsed = adapter.parseWebhook(payloadData);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.reason }, { status: 400 });
  }
  const session = await prisma.checkoutSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.provider !== providerName) {
    return NextResponse.json({ error: "Provider mismatch" }, { status: 400 });
  }
  if (parsed.paid) {
    const price = await prisma.price.findUnique({ where: { id: session.priceId } });
    if (!price) {
      return NextResponse.json({ error: "Price not found" }, { status: 404 });
    }
    const result = await prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findUnique({
        where: {
          provider_providerRef: {
            provider: session.provider,
            providerRef: parsed.providerRef,
          },
        },
      });
      const payment = await tx.payment.upsert({
        where: {
          provider_providerRef: {
            provider: session.provider,
            providerRef: parsed.providerRef,
          },
        },
        create: {
          userId: session.userId,
          checkoutSessionId: session.id,
          provider: session.provider,
          providerRef: parsed.providerRef,
          amount: price.amount,
          currency: "IRR",
          status: PaymentStatus.PAID,
        },
        update: {
          userId: session.userId,
          checkoutSessionId: session.id,
          amount: price.amount,
          currency: "IRR",
          status: PaymentStatus.PAID,
        },
      });
      await tx.invoice.upsert({
        where: { paymentId: payment.id },
        create: {
          paymentId: payment.id,
          userId: session.userId,
          total: price.amount,
          currency: "IRR",
          status: InvoiceStatus.PAID,
        },
        update: {
          userId: session.userId,
          total: price.amount,
          currency: "IRR",
          status: InvoiceStatus.PAID,
        },
      });
      await tx.checkoutSession.update({
        where: { id: session.id },
        data: {
          status: CheckoutStatus.SUCCESS,
          providerCallbackPayload: payloadData,
        },
      });
      return {
        payment,
        shouldApply: !existingPayment || existingPayment.status !== PaymentStatus.PAID,
      };
    });
    if (result.shouldApply) {
      await applyEntitlements({
        userId: session.userId,
        priceId: session.priceId,
        paymentId: result.payment.id,
      });
    }
    return NextResponse.json({ ok: true, status: "PAID" });
  }
  await prisma.checkoutSession.update({
    where: { id: session.id },
    data: {
      status: CheckoutStatus.FAILED,
      providerCallbackPayload: payloadData,
    },
  });
  return NextResponse.json({ ok: true, status: "FAILED" });
};
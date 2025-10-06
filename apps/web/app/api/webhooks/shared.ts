import { NextRequest } from "next/server";

import type { Prisma } from "@prisma/client";

import { applyEntitlements } from "@/lib/billing/entitlements";
import { providers } from "@/lib/billing/providers";
import { ProviderName } from "@/lib/billing/providers/types";
import { verifySignature } from "@/lib/billing/verifySignature";
import { prisma } from "@/lib/db";
import { badRequest, notFound, ok, safeJson, unauthorized } from "@/lib/http";
import { CheckoutStatus, InvoiceStatus, PaymentStatus } from "@/lib/prismaEnums";

export const handleWebhook = async (
  request: NextRequest,
  providerName: ProviderName,
) => {
  const signature = request.headers.get("x-webhook-signature");
  if (!verifySignature(signature)) {
    return unauthorized("Invalid signature");
  }

  const parsedJson = await safeJson<unknown>(request);
  if (!parsedJson.ok) {
    return badRequest("Invalid JSON");
  }
  const payload = parsedJson.data;

  if (!payload || typeof payload !== "object") {
    return badRequest("Invalid payload");
  }

  const providerPayload = payload as Prisma.InputJsonValue;
  const payloadData = payload as Record<string, unknown>;
  const sessionId = payloadData.sessionId;

  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return badRequest("Missing sessionId"); 
  }
  const adapter = providers[providerName];
  const parsed = adapter.parseWebhook(payloadData);
  if (!parsed.ok) {
    return badRequest(parsed.reason);
  }

  const session = await prisma.checkoutSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return notFound("Session not found");
  }

  if (session.provider !== providerName) {
    return badRequest("Provider mismatch");
  }

  if (parsed.paid) {
    const price = await prisma.price.findUnique({ where: { id: session.priceId } });
    if (!price) {
      return badRequest("Price not found");
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
          providerCallbackPayload: providerPayload,
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
    return ok({ ok: true, status: "PAID" as const });
  }

  await prisma.checkoutSession.update({
    where: { id: session.id },
    data: {
      status: CheckoutStatus.FAILED,
      providerCallbackPayload: providerPayload,
    },
  });

  return ok({ ok: true, status: "FAILED" as const });
};
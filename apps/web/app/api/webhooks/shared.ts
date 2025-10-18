import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import {
  extractAmountCurrency,
  extractExternalId,
  extractProviderRef,
  mapProviderStatus,
  type ProviderName,
  type WebhookStatus,
  verifySignature,
} from "@/lib/billing/providers";
import {
  processWebhook,
  recordInvalidWebhook,
  type ProcessWebhookResult,
} from "@/lib/billing/webhookService";
import { prisma } from "@/lib/prisma";
import { CheckoutStatus } from "@/lib/prismaEnums";
import { badRequest, notFound, ok, safeJson } from "@/lib/http";

const SESSION_ID_KEYS = ["sessionId", "session_id"] as const;

const getSessionId = (payload: Record<string, unknown>) => {
  for (const key of SESSION_ID_KEYS) {
    const value = payload[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
};

const statusToCheckoutStatus = (status: WebhookStatus): CheckoutStatus => {
  if (status === "PAID") {
    return CheckoutStatus.SUCCESS;
  }
  if (status === "PENDING") {
    return CheckoutStatus.PENDING;
  }
  return CheckoutStatus.FAILED;
};

const ensureRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const buildLogEventType = (payload: Record<string, unknown>): string | undefined => {
  const status = payload.status;
  if (typeof status === "string" && status.trim().length > 0) {
    return status;
  }
  if (typeof status === "number" && Number.isFinite(status)) {
    return String(Math.trunc(status));
  }
  return undefined;
};

type ExecutionOptions = {
  provider: ProviderName;
  payload: Record<string, unknown>;
  signature: string | null;
  skipSignatureCheck?: boolean;
};

const executeWebhook = async ({
  provider,
  payload,
  signature,
  skipSignatureCheck = false,
}: ExecutionOptions): Promise<ProcessWebhookResult & { status: WebhookStatus }> => {

  const sessionId = getSessionId(payload);
  if (!sessionId) {
    throw new Error("Missing sessionId");
  }

  const session = await prisma.checkoutSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    throw new Error("Session not found");
  }
  if (session.provider !== provider) {
    throw new Error("Provider mismatch");
  }

  const externalId = extractExternalId(provider, payload);
  const providerRef = extractProviderRef(provider, payload);
  const eventType = buildLogEventType(payload);

  if (!skipSignatureCheck && !verifySignature(provider, signature)) {
    await recordInvalidWebhook({
      provider,
      externalId,
      rawPayload: payload as Prisma.JsonObject,
      signature: signature ?? undefined,
      eventType,
    });
    throw new Error("Invalid signature");
  }

  const status = mapProviderStatus(provider, payload);
  const amountInfo = extractAmountCurrency(provider, payload);

  const price = await prisma.price.findUnique({ where: { id: session.priceId } });
  if (!price) {
    throw new Error("Price not found");
  }

  const amount = amountInfo.amount > 0 ? amountInfo.amount : price.amount;
  const currency = amountInfo.currency || price.currency || "IRR";

  const result = await processWebhook({
    provider,
    externalId,
    providerRef,
    status,
    amount,
    currency,
    rawPayload: payload as Prisma.JsonObject,
    userId: session.userId,
    checkoutSessionId: session.id,
    signature: signature ?? undefined,
    eventType,
  });

  if (result.idempotent) {
    return { ...result, status };
  }

  await prisma.checkoutSession.update({
    where: { id: session.id },
    data: {
      status: statusToCheckoutStatus(status),
      providerCallbackPayload: payload as Prisma.JsonObject,
    },
  });

  return { ...result, status };
};

export const handleWebhook = async (
  request: NextRequest,
  provider: ProviderName,
) => {
  const parsed = await safeJson<unknown>(request);
  if (!parsed.ok) {
    return badRequest("Invalid JSON");
  }

  const payload = parsed.data;
  if (!ensureRecord(payload)) {
    return badRequest("Invalid payload");
  }

  try {
    const result = await executeWebhook({
      provider,
      payload,
      signature: request.headers.get("x-webhook-signature"),
    });
    if (result.idempotent) {
      return ok({ ok: true, idempotent: true });
    }
    return ok({ ok: true, status: result.status, paymentId: result.paymentId, invoiceId: result.invoiceId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unhandled error";
    if (message === "Session not found") {
      return notFound(message);
    }
    if (message === "Invalid signature") {
      return badRequest(message);
    }
    return badRequest(message);
  }
};

export const runWebhookSimulation = async (
  provider: ProviderName,
  payload: Record<string, unknown>,
  options: { signature?: string | null } = {},
) => {
  const signature = options.signature ?? null;
  const result = await executeWebhook({
    provider,
    payload,
    signature,
    skipSignatureCheck: true,
  });
  return result;
};

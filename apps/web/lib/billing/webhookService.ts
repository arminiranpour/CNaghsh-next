import { Prisma } from "@prisma/client";

import type { ProviderName, WebhookStatus } from "@/lib/billing/providers";
import { buildAbsoluteUrl } from "@/lib/url";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus, PaymentStatus } from "@/lib/prismaEnums";

import { applyPaymentToSubscription } from "./paymentToSubscription";
import { applyPaymentToJobCredits } from "./paymentToJobCredits";
import { assignInvoiceNumber } from "./invoiceNumber";
import {
  emitBillingInvoiceReady,
  emitBillingPaymentFailed,
} from "@/lib/notifications/events";

const billingDashboardUrl = buildAbsoluteUrl("/dashboard/billing");
const supportMailto = process.env.NOTIFICATIONS_SUPPORT_EMAIL ?? "mailto:support@cnaghsh.com";

type JsonPayload = Prisma.InputJsonValue;

type ProcessWebhookInput = {
  provider: ProviderName;
  externalId: string;
  providerRef: string;
  status: WebhookStatus;
  amount: number;
  currency: string;
  rawPayload: JsonPayload;
  userId: string;
  checkoutSessionId: string;
  signature?: string;
  eventType?: string;
};

type PrismaClientLike = typeof prisma;

export type ProcessWebhookResult = {
  idempotent: boolean;
  webhookLogId?: string;
  paymentId?: string;
  invoiceId?: string | null;
};

const isUniqueConstraintError = (error: unknown) => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
};

const mapStatusToPayment = (status: WebhookStatus): (typeof PaymentStatus)[keyof typeof PaymentStatus] => {
  if (status === "PAID") {
    return PaymentStatus.PAID;
  }
  if (status === "PENDING") {
    return PaymentStatus.PENDING;
  }
  if (status === "REFUNDED") {
    return PaymentStatus.REFUNDED;
  }
  return PaymentStatus.FAILED;
};

export const processWebhook = async (
  input: ProcessWebhookInput,
  client: PrismaClientLike = prisma,
): Promise<ProcessWebhookResult> => {
  const logData = {
    provider: input.provider,
    externalId: input.externalId,
    eventType: input.eventType,
    signature: input.signature,
    payload: input.rawPayload,
    status: "received",
  } satisfies Prisma.PaymentWebhookLogCreateInput;

  let log;
  try {
    log = await client.paymentWebhookLog.create({ data: logData });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { idempotent: true };
    }
    throw error;
  }

  const paymentStatus = mapStatusToPayment(input.status);

  const result = await client.$transaction(async (tx) => {
    const payment = await tx.payment.upsert({
      where: {
        provider_providerRef: {
          provider: input.provider,
          providerRef: input.providerRef,
        },
      },
      create: {
        provider: input.provider,
        providerRef: input.providerRef,
        status: paymentStatus,
        amount: input.amount,
        currency: input.currency,
        userId: input.userId,
        checkoutSessionId: input.checkoutSessionId,
      },
      update: {
        status: paymentStatus,
        amount: input.amount,
        currency: input.currency,
        userId: input.userId,
        checkoutSessionId: input.checkoutSessionId,
      },
    });

    let invoiceId: string | null = null;
    if (input.status === "PAID") {
      const existingInvoice = await tx.invoice.findUnique({
        where: { paymentId: payment.id },
      });
      if (existingInvoice) {
        invoiceId = existingInvoice.id;
      } else {
        const invoiceCreateData: Prisma.InvoiceUncheckedCreateInput = {
          paymentId: payment.id,
          userId: input.userId,
          total: input.amount,
          currency: input.currency,
          status: InvoiceStatus.PAID,
          type: "SALE",
          providerRef: input.providerRef,
          issuedAt: new Date(),
        };

        const invoice = await tx.invoice.create({
          data: invoiceCreateData,
        });
        invoiceId = invoice.id;
      }

      if (invoiceId) {
        await assignInvoiceNumber({ invoiceId, tx });
      }
    }

    await tx.paymentWebhookLog.update({
      where: { id: log.id },
      data: {
        status: "handled",
        handledAt: new Date(),
        paymentId: payment.id,
      },
    });

    return { payment, invoiceId } as const;
  });

  if (process.env.NODE_ENV !== "production") {
    console.info("[DEBUG:webhook] paymentStatus", {
      paymentStatus,
      paymentId: result.payment.id,
      provider: input.provider,
    });
  }

  if (paymentStatus === PaymentStatus.PAID) {
    try {
      await applyPaymentToSubscription({
        paymentId: result.payment.id,
        invoiceId: result.invoiceId ?? undefined,
      });
    } catch (error) {
      console.error("applyPaymentToSubscription", error);
    }

    try {
      await applyPaymentToJobCredits({ paymentId: result.payment.id });
    } catch (error) {
      console.error("applyPaymentToJobCredits", error);
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("[DEBUG:webhook] applied_benefits", {
        paymentId: result.payment.id,
      });
    }
  }

  if (result.invoiceId) {
    const invoiceRecord = await prisma.invoice.findUnique({
      where: { id: result.invoiceId },
      select: { number: true, issuedAt: true, total: true },
    });

    if (invoiceRecord) {
      await emitBillingInvoiceReady({
        userId: input.userId,
        invoiceId: result.invoiceId,
        invoiceNumber: invoiceRecord.number ?? null,
        amount: invoiceRecord.total,
        issuedAt: invoiceRecord.issuedAt ?? new Date(),
      });
    }
  }

  if (paymentStatus === PaymentStatus.FAILED) {
    await emitBillingPaymentFailed({
      userId: input.userId,
      paymentId: result.payment.id,
      amount: result.payment.amount,
      providerLabel: input.provider,
      reference: result.payment.providerRef,
      retryUrl: billingDashboardUrl,
      supportUrl: supportMailto,
    });
  }

  return {
    idempotent: false,
    webhookLogId: log.id,
    paymentId: result.payment.id,
    invoiceId: result.invoiceId,
  };
};

type RecordInvalidArgs = {
  provider: ProviderName;
  externalId: string;
  rawPayload: JsonPayload;
  signature?: string;
  eventType?: string;
};

export const recordInvalidWebhook = async (
  args: RecordInvalidArgs,
  client: PrismaClientLike = prisma,
): Promise<void> => {
  try {
    await client.paymentWebhookLog.create({
      data: {
        provider: args.provider,
        externalId: args.externalId,
        payload: args.rawPayload,
        signature: args.signature,
        eventType: args.eventType,
        status: "invalid",
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      await client.paymentWebhookLog.updateMany({
        where: {
          provider: args.provider,
          externalId: args.externalId,
        },
        data: {
          status: "invalid",
          signature: args.signature,
          eventType: args.eventType,
          payload: args.rawPayload,
        },
      });
      return;
    }
    throw error;
  }
};

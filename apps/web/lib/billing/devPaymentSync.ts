import { PaymentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { applyPaymentToJobCredits } from "./paymentToJobCredits";
import { applyPaymentToSubscription } from "./paymentToSubscription";

const isDevEnvironment = process.env.NODE_ENV !== "production";

type DevSyncResult =
  | { triggered: false; reason: "NOT_DEV" | "NO_PAYMENT" | "NOT_PAID" }
  | { triggered: true; paymentId: string };

export async function runDevPaymentSyncForSession(
  checkoutSessionId: string,
): Promise<DevSyncResult> {
  if (!isDevEnvironment) {
    return { triggered: false, reason: "NOT_DEV" };
  }

  const payment = await prisma.payment.findFirst({
    where: { checkoutSessionId },
    orderBy: { createdAt: "desc" },
  });

  if (!payment) {
    return { triggered: false, reason: "NO_PAYMENT" };
  }

  if (payment.status !== PaymentStatus.PAID) {
    return { triggered: false, reason: "NOT_PAID" };
  }

  if (isDevEnvironment) {
    console.info("[billing.devFallback] applying", {
      checkoutSessionId,
      paymentId: payment.id,
    });
  }

  try {
    await applyPaymentToSubscription({ paymentId: payment.id });
  } catch (error) {
    console.error("[billing.devFallback] subscription_failed", {
      checkoutSessionId,
      paymentId: payment.id,
      error,
    });
  }

  try {
    await applyPaymentToJobCredits({ paymentId: payment.id });
  } catch (error) {
    console.error("[billing.devFallback] job_credit_failed", {
      checkoutSessionId,
      paymentId: payment.id,
      error,
    });
  }

  return { triggered: true, paymentId: payment.id };
}

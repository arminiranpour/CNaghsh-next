import "server-only";

import { Prisma } from "@prisma/client";

import type { ProviderName } from "@/lib/billing/provider.types";
import { providers } from "@/lib/billing/providerAdapters";
import { prisma } from "@/lib/db";
import { CheckoutStatus, PaymentStatus, Provider } from "@/lib/prismaEnums";
import { sanitizeReturnUrl } from "@/lib/url";

const isUniqueConstraintError = (error: unknown) => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
};

const isProviderName = (value: unknown): value is ProviderName => {
  return value === "zarinpal" || value === "idpay" || value === "nextpay";
};

type ChallengeCheckoutInput = {
  challengeId: string;
  participationId: string;
  userId: string;
  provider?: ProviderName;
  returnUrl?: string;
};

export type ChallengeCheckoutSession = {
  sessionId: string;
  redirectUrl: string;
  returnUrl: string;
};

export async function createChallengeCheckoutSession({
  challengeId,
  participationId,
  userId,
  provider,
  returnUrl,
}: ChallengeCheckoutInput): Promise<ChallengeCheckoutSession> {
  const participation = await prisma.challengeParticipation.findUnique({
    where: { id: participationId },
    select: {
      id: true,
      userId: true,
      status: true,
      challenge: {
        select: {
          id: true,
          status: true,
          priceIrr: true,
        },
      },
    },
  });

  if (!participation || participation.challenge.id !== challengeId) {
    throw new Error("PARTICIPATION_NOT_FOUND");
  }

  if (participation.userId !== userId) {
    throw new Error("FORBIDDEN");
  }

  if (participation.status !== "payment_pending") {
    throw new Error("INVALID_PARTICIPATION_STATUS");
  }

  if (participation.challenge.status !== "published") {
    throw new Error("CHALLENGE_NOT_PUBLISHED");
  }

  const amountIrr = participation.challenge.priceIrr;
  if (!Number.isFinite(amountIrr) || amountIrr <= 0) {
    throw new Error("FREE_CHALLENGE");
  }

  const resolvedProvider = provider ?? "zarinpal";
  if (!isProviderName(resolvedProvider)) {
    throw new Error("UNKNOWN_PROVIDER");
  }

  const idempotencyKey = `challenge:${challengeId}:${participationId}:${amountIrr}`;
  const existingSession = await prisma.checkoutSession.findUnique({
    where: { idempotencyKey },
    select: {
      id: true,
      redirectUrl: true,
      returnUrl: true,
    },
  });

  if (existingSession) {
    return {
      sessionId: existingSession.id,
      redirectUrl: existingSession.redirectUrl,
      returnUrl: existingSession.returnUrl,
    };
  }

  const price = await prisma.price.create({
    data: {
      amount: amountIrr,
      currency: "IRR",
      active: true,
    },
  });

  let session;

  try {
    session = await prisma.checkoutSession.create({
      data: {
        userId,
        provider: resolvedProvider as Provider,
        priceId: price.id,
        purchaseType: "challenge_participation",
        challengeId,
        challengeParticipationId: participationId,
        idempotencyKey,
        status: CheckoutStatus.STARTED,
        redirectUrl: "",
        returnUrl: "",
        providerInitPayload: {
          challengeParticipation: {
            challengeId,
            participationId,
          },
        },
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      await prisma.price.delete({ where: { id: price.id } }).catch(() => null);
      const existing = await prisma.checkoutSession.findUnique({
        where: { idempotencyKey },
        select: { id: true, redirectUrl: true, returnUrl: true },
      });
      if (existing) {
        return {
          sessionId: existing.id,
          redirectUrl: existing.redirectUrl,
          returnUrl: existing.returnUrl,
        };
      }
    }
    throw error;
  }

  const fallbackPath = `/challenges/payment/result?sessionId=${session.id}`;
  const resolvedReturnUrl = sanitizeReturnUrl(returnUrl, fallbackPath);

  const adapter = providers[resolvedProvider];
  if (!adapter) {
    throw new Error("UNKNOWN_PROVIDER");
  }

  const startResult = await adapter.start({
    sessionId: session.id,
    amount: amountIrr,
    currency: "IRR",
    returnUrl: resolvedReturnUrl,
  });

  await prisma.checkoutSession.update({
    where: { id: session.id },
    data: {
      redirectUrl: startResult.redirectUrl,
      returnUrl: resolvedReturnUrl,
    },
  });

  return {
    sessionId: session.id,
    redirectUrl: startResult.redirectUrl,
    returnUrl: resolvedReturnUrl,
  };
}

export async function applyChallengePaymentFromWebhook({
  paymentId,
  status,
}: {
  paymentId: string;
  status: keyof typeof PaymentStatus;
}) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      session: {
        select: {
          id: true,
          purchaseType: true,
          challengeId: true,
          challengeParticipationId: true,
        },
      },
    },
  });

  if (!payment?.session) {
    return { applied: false, reason: "SESSION_NOT_FOUND" } as const;
  }

  if (payment.session.purchaseType !== "challenge_participation") {
    return { applied: false, reason: "NOT_CHALLENGE" } as const;
  }

  const participationId = payment.session.challengeParticipationId;
  if (!participationId) {
    return { applied: false, reason: "PARTICIPATION_NOT_FOUND" } as const;
  }

  if (status === PaymentStatus.PAID) {
    await prisma.challengeParticipation.updateMany({
      where: {
        id: participationId,
        status: "payment_pending",
      },
      data: {
        status: "registered",
      },
    });

    return { applied: true } as const;
  }

  return { applied: false, reason: "STATUS_IGNORED" } as const;
}

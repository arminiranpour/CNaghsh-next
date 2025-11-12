import { PaymentStatus, Prisma, ProductType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { JOB_POST_CREDIT } from "./entitlementKeys";
import { revalidateJobCreditViews } from "@/lib/entitlements/revalidate";

const JOB_CREDIT_REASON = "JOB_CREDIT_PURCHASE" as const;

const isUniqueConstraintError = (error: unknown): boolean => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
};

const coerceCreditValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const normalized = Math.trunc(value);
    return normalized > 0 ? normalized : null;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("jobCredits" in record) {
      return coerceCreditValue(record.jobCredits);
    }
    if ("credits" in record) {
      return coerceCreditValue(record.credits);
    }
  }

  return null;
};

const resolveCreditsPerPurchase = (payment: {
  session: {
    providerInitPayload: unknown;
    price: {
      product: unknown;
    } | null;
  } | null;
}): number => {
  const price = payment.session?.price;
  const candidates: unknown[] = [];

  if (price) {
    const priceMetadata = (price as { metadata?: unknown }).metadata;
    if (priceMetadata) {
      candidates.push(priceMetadata);
    }

    const productMetadata = (price.product as { metadata?: unknown } | undefined)?.metadata;
    if (productMetadata) {
      candidates.push(productMetadata);
    }
  }

  if (payment.session?.providerInitPayload) {
    candidates.push(payment.session.providerInitPayload);
  }

  for (const source of candidates) {
    const credits = coerceCreditValue(source);
    if (credits) {
      return credits;
    }
  }

  return 1;
};

export type ApplyPaymentToJobCreditsResult =
  | {
      applied: true;
      ledgerId: string;
      creditsGranted: number;
      newBalance: number;
    }
  | {
      applied: false;
      reason:
        | "PAYMENT_NOT_FOUND"
        | "PAYMENT_NOT_PAID"
        | "MISSING_PRICE"
        | "NOT_JOB_PRODUCT"
        | "ALREADY_GRANTED";
    };

type ApplyPaymentArgs = {
  paymentId: string;
};

export async function applyPaymentToJobCredits({
  paymentId,
}: ApplyPaymentArgs): Promise<ApplyPaymentToJobCreditsResult> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      session: {
        include: {
          price: {
            include: { product: true },
          },
        },
      },
    },
  });

  if (!payment) {
    return { applied: false, reason: "PAYMENT_NOT_FOUND" };
  }

  if (payment.status !== PaymentStatus.PAID) {
    return { applied: false, reason: "PAYMENT_NOT_PAID" };
  }

  const price = payment.session?.price;
  if (!price) {
    return { applied: false, reason: "MISSING_PRICE" };
  }

  if (!price.product || price.product.type !== ProductType.JOB_POST) {
    return { applied: false, reason: "NOT_JOB_PRODUCT" };
  }

  const creditsPerPurchase = Math.max(1, resolveCreditsPerPurchase(payment));

  const grantResult = await prisma.$transaction(async (tx) => {
    const ledger = await tx.jobCreditGrant
      .create({
        data: {
          userId: payment.userId,
          paymentId: payment.id,
          credits: creditsPerPurchase,
          reason: JOB_CREDIT_REASON,
        },
      })
      .catch((error: unknown) => {
        if (isUniqueConstraintError(error)) {
          return null;
        }
        throw error;
      });

    if (!ledger) {
      return { applied: false as const, reason: "ALREADY_GRANTED" as const };
    }

    const existing = await tx.userEntitlement.findFirst({
      where: {
        userId: payment.userId,
        key: JOB_POST_CREDIT,
        expiresAt: null,
      },
      select: {
        id: true,
      },
    });

    const updated = existing
      ? await tx.userEntitlement.update({
          where: { id: existing.id },
          data: {
            remainingCredits: {
              increment: creditsPerPurchase,
            },
          },
          select: { remainingCredits: true },
        })
      : await tx.userEntitlement.create({
          data: {
            userId: payment.userId,
            key: JOB_POST_CREDIT,
            remainingCredits: creditsPerPurchase,
            expiresAt: null,
          },
          select: { remainingCredits: true },
        });

    const newBalance = updated.remainingCredits ?? creditsPerPurchase;

    return {
      applied: true as const,
      ledgerId: ledger.id,
      creditsGranted: creditsPerPurchase,
      newBalance,
    };
  });

  if (!grantResult.applied) {
    console.info("[billing.jobCredits] duplicate_grant", {
      userId: payment.userId,
      paymentId: payment.id,
    });

    try {
      await prisma.auditLog.create({
        data: {
          actorId: payment.userId,
          actorEmail: null,
          resourceType: "payment",
          resourceId: payment.id,
          action: "JOB_CREDIT_DUPLICATE_GUARD",
          reason: JOB_CREDIT_REASON,
          before: Prisma.DbNull,
          after: Prisma.DbNull,
          metadata: {
            status: "duplicate",
          },
          idempotencyKey: `job_credit:${payment.id}:duplicate`,
        },
      });
    } catch (error) {
      console.error("[billing.jobCredits] audit_duplicate_failed", error);
    }

    return grantResult;
  }

  console.info("[billing.jobCredits] grant_success", {
    userId: payment.userId,
    paymentId: payment.id,
    credits: grantResult.creditsGranted,
    ledgerId: grantResult.ledgerId,
    balance: grantResult.newBalance,
  });

  try {
    await prisma.auditLog.create({
      data: {
        actorId: payment.userId,
        actorEmail: null,
        resourceType: "payment",
        resourceId: payment.id,
        action: "JOB_CREDIT_GRANTED",
        reason: JOB_CREDIT_REASON,
        before: Prisma.DbNull,
        after: {
          creditsGranted: grantResult.creditsGranted,
          balance: grantResult.newBalance,
          ledgerId: grantResult.ledgerId,
        },
        metadata: Prisma.DbNull,
        idempotencyKey: `job_credit:${payment.id}`,
      },
    });
  } catch (error) {
    console.error("[billing.jobCredits] audit_grant_failed", error);
  }

  await revalidateJobCreditViews(payment.userId);

  return grantResult;
}

import "server-only";

import { Prisma } from "@prisma/client";

import type { ProviderName } from "@/lib/billing/provider.types";
import { providers } from "@/lib/billing/providerAdapters";
import { computeSemesterPricing, getLumpSumPayableAmount } from "@/lib/courses/pricing";
import { prisma } from "@/lib/db";
import { CheckoutStatus, Provider, PaymentStatus } from "@/lib/prismaEnums";
import { sanitizeReturnUrl } from "@/lib/url";

const isUniqueConstraintError = (error: unknown) => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
};

const isProviderName = (value: unknown): value is ProviderName => {
  return value === "zarinpal" || value === "idpay" || value === "nextpay";
};

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

type CheckoutInput = {
  enrollmentId: string;
  userId: string;
  paymentMode: "lumpsum" | "installments";
  installmentIndex?: number | null;
  provider?: ProviderName;
  returnUrl?: string;
};

export type CourseCheckoutSession = {
  sessionId: string;
  redirectUrl: string;
  returnUrl: string;
};

export async function ensureInstallmentPlan({
  enrollmentId,
  semester,
}: {
  enrollmentId: string;
  semester: {
    startsAt: Date;
    tuitionAmountIrr: number;
    lumpSumDiscountAmountIrr: number;
    installmentPlanEnabled: boolean;
    installmentCount: number | null;
    currency: string;
  };
}) {
  if (!semester.installmentPlanEnabled || !semester.installmentCount) {
    throw new Error("INSTALLMENTS_DISABLED");
  }

  if (semester.currency !== "IRR") {
    throw new Error("UNSUPPORTED_CURRENCY");
  }

  const pricing = computeSemesterPricing(semester);
  const installments = pricing.installments;
  if (!installments) {
    throw new Error("INSTALLMENTS_DISABLED");
  }

  await prisma.$transaction(async (tx) => {
    await tx.coursePaymentPlan.upsert({
      where: { enrollmentId },
      create: {
        enrollmentId,
        installmentCount: installments.count,
        installmentAmountIrr: installments.amountPerInstallment,
      },
      update: {},
    });

    const baseDate = new Date(semester.startsAt);
    const installmentRows = Array.from({ length: installments.count }, (_, idx) => {
      const index = idx + 1;
      const amountIrr =
        index === installments.count
          ? installments.lastInstallmentAmount
          : installments.amountPerInstallment;

      return {
        enrollmentId,
        index,
        amountIrr,
        status: "due" as const,
        dueAt: addMonths(baseDate, index - 1),
      };
    });

    await tx.coursePaymentInstallment.createMany({
      data: installmentRows,
      skipDuplicates: true,
    });
  });
}

export async function computeNextInstallmentToPay(enrollmentId: string) {
  return prisma.coursePaymentInstallment.findFirst({
    where: {
      enrollmentId,
      status: { in: ["due", "failed"] },
    },
    orderBy: { index: "asc" },
  });
}

export async function createCourseCheckoutSession({
  enrollmentId,
  userId,
  paymentMode,
  installmentIndex,
  provider,
  returnUrl,
}: CheckoutInput): Promise<CourseCheckoutSession> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      userId: true,
      status: true,
      chosenPaymentMode: true,
      semester: {
        select: {
          id: true,
          courseId: true,
          status: true,
          startsAt: true,
          tuitionAmountIrr: true,
          currency: true,
          lumpSumDiscountAmountIrr: true,
          installmentPlanEnabled: true,
          installmentCount: true,
          course: {
            select: {
              status: true,
            },
          },
        },
      },
    },
  });

  if (!enrollment) {
    throw new Error("ENROLLMENT_NOT_FOUND");
  }

  if (enrollment.userId !== userId) {
    throw new Error("FORBIDDEN");
  }

  if (enrollment.status !== "pending_payment") {
    throw new Error(enrollment.status === "active" ? "ALREADY_PAID" : "INVALID_ENROLLMENT_STATUS");
  }

  if (enrollment.chosenPaymentMode !== paymentMode) {
    throw new Error("PAYMENT_MODE_MISMATCH");
  }

  if (enrollment.semester.course.status !== "published") {
    throw new Error("COURSE_NOT_PUBLISHED");
  }

  if (enrollment.semester.status === "draft") {
    throw new Error("SEMESTER_NOT_OPEN");
  }

  if (enrollment.semester.currency !== "IRR") {
    throw new Error("UNSUPPORTED_CURRENCY");
  }

  let resolvedInstallmentIndex: number | null = null;
  let amountIrr: number;

  if (paymentMode === "lumpsum") {
    const pricing = computeSemesterPricing(enrollment.semester);
    amountIrr = getLumpSumPayableAmount(pricing);
  } else {
    if (
      !enrollment.semester.installmentPlanEnabled ||
      !enrollment.semester.installmentCount ||
      enrollment.semester.installmentCount < 2
    ) {
      throw new Error("INSTALLMENTS_DISABLED");
    }

    await ensureInstallmentPlan({
      enrollmentId: enrollment.id,
      semester: enrollment.semester,
    });

    const nextInstallment = await computeNextInstallmentToPay(enrollment.id);
    if (!nextInstallment) {
      throw new Error("ALREADY_PAID");
    }

    if (
      installmentIndex !== undefined &&
      installmentIndex !== null &&
      installmentIndex !== nextInstallment.index
    ) {
      throw new Error("INVALID_INSTALLMENT");
    }

    resolvedInstallmentIndex = nextInstallment.index;
    amountIrr = nextInstallment.amountIrr;
  }

  if (!Number.isFinite(amountIrr) || amountIrr <= 0) {
    throw new Error("INVALID_AMOUNT");
  }

  const resolvedProvider = provider ?? "zarinpal";
  if (!isProviderName(resolvedProvider)) {
    throw new Error("UNKNOWN_PROVIDER");
  }

  const idempotencyKey = `course:${enrollment.id}:${paymentMode}:${resolvedInstallmentIndex ?? 0}:${amountIrr}`;

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
        purchaseType: "course_semester",
        courseId: enrollment.semester.courseId,
        semesterId: enrollment.semester.id,
        enrollmentId: enrollment.id,
        paymentMode,
        installmentIndex: resolvedInstallmentIndex,
        idempotencyKey,
        status: CheckoutStatus.STARTED,
        redirectUrl: "",
        returnUrl: "",
        providerInitPayload: {
          coursePayment: {
            paymentMode,
            installmentIndex: resolvedInstallmentIndex,
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

  const fallbackPath = `/courses/payment/success?sessionId=${session.id}`;
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

export async function applyCoursePaymentFromWebhook({
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
          enrollmentId: true,
          paymentMode: true,
          installmentIndex: true,
        },
      },
    },
  });

  if (!payment?.session) {
    return { applied: false, reason: "SESSION_NOT_FOUND" } as const;
  }

  if (payment.session.purchaseType !== "course_semester") {
    return { applied: false, reason: "NOT_COURSE" } as const;
  }

  const enrollmentId = payment.session.enrollmentId;
  if (!enrollmentId) {
    return { applied: false, reason: "ENROLLMENT_NOT_FOUND" } as const;
  }

  if (status === PaymentStatus.PAID) {
    if (payment.session.paymentMode === "lumpsum") {
      await prisma.enrollment.updateMany({
        where: { id: enrollmentId, status: "pending_payment" },
        data: { status: "active" },
      });
      return { applied: true, mode: "lumpsum" } as const;
    }

    if (payment.session.paymentMode === "installments") {
      const installmentIndex = payment.session.installmentIndex;
      if (!installmentIndex || installmentIndex < 1) {
        return { applied: false, reason: "INSTALLMENT_NOT_FOUND" } as const;
      }

      const updated = await prisma.$transaction(async (tx) => {
        const installment = await tx.coursePaymentInstallment.findUnique({
          where: {
            enrollmentId_index: {
              enrollmentId,
              index: installmentIndex,
            },
          },
          select: { id: true, status: true, paidPaymentId: true },
        });

        if (!installment) {
          return { updated: false as const, reason: "INSTALLMENT_NOT_FOUND" } as const;
        }

        if (installment.status === "paid") {
          return { updated: false as const, reason: "ALREADY_PAID" } as const;
        }

        await tx.coursePaymentInstallment.update({
          where: { id: installment.id },
          data: {
            status: "paid",
            paidAt: new Date(),
            paidPaymentId: payment.id,
          },
        });

        const remaining = await tx.coursePaymentInstallment.count({
          where: {
            enrollmentId,
            status: { not: "paid" },
          },
        });

        if (remaining === 0) {
          await tx.enrollment.updateMany({
            where: { id: enrollmentId, status: "pending_payment" },
            data: { status: "active" },
          });
        }

        return { updated: true as const };
      });

      if (!updated.updated) {
        return { applied: false, reason: updated.reason } as const;
      }

      return { applied: true, mode: "installments" } as const;
    }

    return { applied: false, reason: "PAYMENT_MODE_MISSING" } as const;
  }

  if (status === PaymentStatus.FAILED) {
    if (payment.session.paymentMode === "installments") {
      const installmentIndex = payment.session.installmentIndex;
      if (!installmentIndex || installmentIndex < 1) {
        return { applied: false, reason: "INSTALLMENT_NOT_FOUND" } as const;
      }

      await prisma.coursePaymentInstallment.updateMany({
        where: {
          enrollmentId,
          index: installmentIndex,
          status: { not: "paid" },
        },
        data: { status: "failed" },
      });
      return { applied: true, mode: "installments" } as const;
    }

    return { applied: false, reason: "NO_ACTION" } as const;
  }

  return { applied: false, reason: "UNSUPPORTED_STATUS" } as const;
}

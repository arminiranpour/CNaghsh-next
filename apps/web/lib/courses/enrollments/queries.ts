import "server-only";

import type {
  CourseInstallmentStatus,
  EnrollmentStatus,
  PaymentMode,
  PaymentStatus,
} from "@prisma/client";

import { computeSemesterPricing, getLumpSumPayableAmount } from "@/lib/courses/pricing";
import { prisma } from "@/lib/db";

type InstallmentSnapshot = {
  id: string;
  index: number;
  amountIrr: number;
  status: CourseInstallmentStatus;
  dueAt: Date | null;
  paidAt: Date | null;
  paidPaymentId: string | null;
};

type EnrollmentPaymentRow = {
  id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  provider: string;
  providerRef: string;
  createdAt: Date;
  sessionId: string;
  paymentMode: PaymentMode | null;
  installmentIndex: number | null;
  invoice: {
    id: string;
    number: string | null;
    status: string;
    total: number;
  } | null;
};

type InstallmentProgress = {
  paidCount: number;
  totalCount: number;
  nextInstallment: InstallmentSnapshot | null;
};

type InstallmentFallback = {
  count: number | null;
  amountPerInstallment: number | null;
};

const isInstallmentPayable = (status: CourseInstallmentStatus) =>
  status === "due" || status === "failed";

const sortInstallments = (installments: InstallmentSnapshot[]) =>
  [...installments].sort((a, b) => a.index - b.index);

const buildInstallmentProgress = (
  installments: InstallmentSnapshot[],
  fallback: InstallmentFallback,
): InstallmentProgress => {
  const sorted = sortInstallments(installments);
  const paidCount = sorted.filter((item) => item.status === "paid").length;
  const totalCount = sorted.length > 0 ? sorted.length : fallback.count ?? 0;
  let nextInstallment = sorted.find((item) => isInstallmentPayable(item.status)) ?? null;

  if (!nextInstallment && totalCount > 0 && fallback.amountPerInstallment) {
    if (paidCount < totalCount) {
      nextInstallment = {
        id: "preview",
        index: Math.min(paidCount + 1, totalCount),
        amountIrr: fallback.amountPerInstallment,
        status: "due",
        dueAt: null,
        paidAt: null,
        paidPaymentId: null,
      };
    }
  }

  return { paidCount, totalCount, nextInstallment };
};

const flattenPayments = (
  sessions: Array<{
    id: string;
    paymentMode: PaymentMode | null;
    installmentIndex: number | null;
    payments: Array<{
      id: string;
      status: PaymentStatus;
      amount: number;
      currency: string;
      provider: string;
      providerRef: string;
      createdAt: Date;
      invoice: {
        id: string;
        number: string | null;
        status: string;
        total: number;
      } | null;
    }>;
  }>,
) => {
  const payments: EnrollmentPaymentRow[] = [];
  for (const session of sessions) {
    for (const payment of session.payments) {
      payments.push({
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        provider: payment.provider,
        providerRef: payment.providerRef,
        createdAt: payment.createdAt,
        sessionId: session.id,
        paymentMode: session.paymentMode,
        installmentIndex: session.installmentIndex,
        invoice: payment.invoice
          ? {
              id: payment.invoice.id,
              number: payment.invoice.number ?? null,
              status: payment.invoice.status,
              total: payment.invoice.total,
            }
          : null,
      });
    }
  }
  return payments;
};

export type UserEnrollmentListItem = {
  id: string;
  status: EnrollmentStatus;
  chosenPaymentMode: PaymentMode;
  createdAt: Date;
  semester: {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    course: {
      id: string;
      title: string;
    };
    installmentPlanEnabled: boolean;
    installmentCount: number | null;
    tuitionAmountIrr: number;
    lumpSumDiscountAmountIrr: number;
  };
  payment: {
    mode: "lumpsum";
    paid: boolean;
    totalIrr: number;
  } | {
    mode: "installments";
    paidCount: number;
    totalCount: number;
    nextAmountIrr: number | null;
  };
};

export async function listUserEnrollments(userId: string): Promise<UserEnrollmentListItem[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      semester: {
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          installmentPlanEnabled: true,
          installmentCount: true,
          tuitionAmountIrr: true,
          lumpSumDiscountAmountIrr: true,
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
      paymentInstallments: {
        select: {
          id: true,
          index: true,
          amountIrr: true,
          status: true,
          dueAt: true,
          paidAt: true,
          paidPaymentId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return enrollments.map((enrollment) => {
    const pricing = computeSemesterPricing({
      tuitionAmountIrr: enrollment.semester.tuitionAmountIrr,
      lumpSumDiscountAmountIrr: enrollment.semester.lumpSumDiscountAmountIrr,
      installmentPlanEnabled: enrollment.semester.installmentPlanEnabled,
      installmentCount: enrollment.semester.installmentCount,
    });

    if (enrollment.chosenPaymentMode === "lumpsum") {
      const lumpSumPayable = getLumpSumPayableAmount(pricing);
      return {
        id: enrollment.id,
        status: enrollment.status,
        chosenPaymentMode: enrollment.chosenPaymentMode,
        createdAt: enrollment.createdAt,
        semester: enrollment.semester,
        payment: {
          mode: "lumpsum",
          paid: enrollment.status === "active" || enrollment.status === "refunded",
          totalIrr: lumpSumPayable,
        },
      };
    }

    const progress = buildInstallmentProgress(enrollment.paymentInstallments, {
      count: pricing.installments?.count ?? enrollment.semester.installmentCount ?? null,
      amountPerInstallment: pricing.installments?.amountPerInstallment ?? null,
    });

    return {
      id: enrollment.id,
      status: enrollment.status,
      chosenPaymentMode: enrollment.chosenPaymentMode,
      createdAt: enrollment.createdAt,
      semester: enrollment.semester,
      payment: {
        mode: "installments",
        paidCount: progress.paidCount,
        totalCount: progress.totalCount,
        nextAmountIrr: progress.nextInstallment?.amountIrr ?? null,
      },
    };
  });
}

export async function getUserEnrollmentDetail(input: {
  enrollmentId: string;
  userId: string;
}) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: input.enrollmentId },
    include: {
      semester: {
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          status: true,
          tuitionAmountIrr: true,
          lumpSumDiscountAmountIrr: true,
          installmentPlanEnabled: true,
          installmentCount: true,
          course: {
            select: {
              id: true,
              title: true,
              instructorName: true,
            },
          },
          scheduleDays: {
            include: {
              classSlots: true,
            },
          },
        },
      },
      paymentInstallments: {
        select: {
          id: true,
          index: true,
          amountIrr: true,
          status: true,
          dueAt: true,
          paidAt: true,
          paidPaymentId: true,
        },
        orderBy: { index: "asc" },
      },
      checkoutSessions: {
        select: {
          id: true,
          paymentMode: true,
          installmentIndex: true,
          payments: {
            select: {
              id: true,
              status: true,
              amount: true,
              currency: true,
              provider: true,
              providerRef: true,
              createdAt: true,
              invoice: {
                select: {
                  id: true,
                  number: true,
                  status: true,
                  total: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!enrollment || enrollment.userId !== input.userId) {
    return null;
  }

  const pricing = computeSemesterPricing({
    tuitionAmountIrr: enrollment.semester.tuitionAmountIrr,
    lumpSumDiscountAmountIrr: enrollment.semester.lumpSumDiscountAmountIrr,
    installmentPlanEnabled: enrollment.semester.installmentPlanEnabled,
    installmentCount: enrollment.semester.installmentCount,
  });

  const installments = enrollment.paymentInstallments;
  const progress = buildInstallmentProgress(installments, {
    count: pricing.installments?.count ?? enrollment.semester.installmentCount ?? null,
    amountPerInstallment: pricing.installments?.amountPerInstallment ?? null,
  });

  const payments = flattenPayments(enrollment.checkoutSessions);
  const lumpSumPayment =
    payments.find((payment) => payment.paymentMode === "lumpsum" && payment.status === "PAID") ??
    payments.find((payment) => payment.paymentMode === "lumpsum") ??
    null;

  const allInstallmentsPaid =
    enrollment.chosenPaymentMode === "installments" &&
    progress.totalCount > 0 &&
    progress.paidCount >= progress.totalCount;

  return {
    enrollment,
    pricing,
    installments,
    payments,
    lumpSumPayment,
    installmentProgress: progress,
    nextInstallment: progress.nextInstallment,
    allInstallmentsPaid,
  };
}

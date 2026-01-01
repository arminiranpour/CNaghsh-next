import "server-only";

import type { EnrollmentStatus, PaymentMode, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

type AdminEnrollmentFilters = {
  courseId?: string;
  semesterId?: string;
  status?: EnrollmentStatus;
  paymentMode?: PaymentMode;
  from?: Date;
  to?: Date;
};

const buildWhere = (filters: AdminEnrollmentFilters): Prisma.EnrollmentWhereInput => {
  const where: Prisma.EnrollmentWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.paymentMode) {
    where.chosenPaymentMode = filters.paymentMode;
  }

  if (filters.semesterId) {
    where.semesterId = filters.semesterId;
  }

  if (filters.courseId) {
    where.semester = { courseId: filters.courseId };
  }

  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) {
      where.createdAt.gte = filters.from;
    }
    if (filters.to) {
      where.createdAt.lte = filters.to;
    }
  }

  return where;
};

const computeInstallmentProgress = (installments: Array<{ status: string }>, fallbackCount: number) => {
  const total = installments.length > 0 ? installments.length : fallbackCount;
  const paid = installments.filter((item) => item.status === "paid").length;
  return { paid, total };
};

export async function listAdminEnrollments(filters: AdminEnrollmentFilters) {
  const enrollments = await prisma.enrollment.findMany({
    where: buildWhere(filters),
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      semester: {
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          installmentCount: true,
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
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return enrollments.map((enrollment) => {
    if (enrollment.chosenPaymentMode === "installments") {
      const progress = computeInstallmentProgress(
        enrollment.paymentInstallments,
        enrollment.semester.installmentCount ?? 0,
      );
      return {
        ...enrollment,
        paymentProgress: progress,
      };
    }

    const paid = enrollment.status === "active" || enrollment.status === "refunded" ? 1 : 0;
    return {
      ...enrollment,
      paymentProgress: { paid, total: 1 },
    };
  });
}

export async function getEnrollmentAdminSummary() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const [
    totalRecent,
    activeCount,
    pendingCount,
    delinquentInstallments,
    revenue,
  ] = await Promise.all([
    prisma.enrollment.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.enrollment.count({
      where: { status: "active" },
    }),
    prisma.enrollment.count({
      where: { status: "pending_payment" },
    }),
    prisma.coursePaymentInstallment.findMany({
      where: {
        status: { in: ["due", "failed"] },
        dueAt: { lt: now, not: null },
      },
      select: { enrollmentId: true },
      distinct: ["enrollmentId"],
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: "PAID",
        createdAt: { gte: thirtyDaysAgo },
        session: { purchaseType: "course_semester" },
      },
    }),
  ]);

  return {
    totalRecent,
    activeCount,
    pendingCount,
    delinquentCount: delinquentInstallments.length,
    revenueIrr: revenue._sum.amount ?? 0,
  };
}

export async function getAdminEnrollmentDetail(enrollmentId: string) {
  return prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      semester: {
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          status: true,
          installmentCount: true,
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
        orderBy: { index: "asc" },
      },
      checkoutSessions: {
        select: {
          id: true,
          provider: true,
          status: true,
          createdAt: true,
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
}

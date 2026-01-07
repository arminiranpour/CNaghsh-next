"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { InvoiceStatus, InvoiceType, PaymentStatus } from "@prisma/client";

import { requireAdmin } from "@/lib/admin/auth";
import { assignInvoiceNumber } from "@/lib/billing/invoiceNumber";
import { prisma } from "@/lib/db";

const appendSearchParams = (path: string, params: URLSearchParams) => {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${params.toString()}`;
};

const buildRedirect = (enrollmentId: string, params: Record<string, string>) =>
  appendSearchParams(`/admin/enrollments/${enrollmentId}`, new URLSearchParams(params));

export async function cancelEnrollmentAction(enrollmentId: string) {
  await requireAdmin();

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, status: true },
  });

  if (!enrollment) {
    redirect(buildRedirect(enrollmentId, { error: "not_found" }));
  }

  if (enrollment.status === "canceled") {
    redirect(buildRedirect(enrollmentId, { notice: "already_canceled" }));
  }

  if (enrollment.status === "refunded") {
    redirect(buildRedirect(enrollmentId, { notice: "already_refunded" }));
  }

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status: "canceled" },
  });

  revalidatePath("/admin/enrollments");
  revalidatePath(`/admin/enrollments/${enrollmentId}`);
  revalidatePath("/dashboard/courses");
  revalidatePath(`/dashboard/courses/${enrollmentId}`);
  redirect(buildRedirect(enrollmentId, { notice: "canceled" }));
}

export async function refundEnrollmentAction(enrollmentId: string, formData: FormData) {
  await requireAdmin();

  const reasonRaw = formData.get("reason");
  const reason =
    typeof reasonRaw === "string" && reasonRaw.trim().length > 0
      ? reasonRaw.trim()
      : "بازپرداخت برای این ثبت‌نام ثبت شد.";

  const result = await prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        checkoutSessions: {
          include: {
            payments: {
              include: {
                invoice: true,
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      return { status: "not_found" } as const;
    }

    if (enrollment.status === "refunded") {
      return { status: "already_refunded" } as const;
    }

    for (const session of enrollment.checkoutSessions) {
      for (const payment of session.payments) {
        const currentRefundedAmount = (payment as typeof payment & { refundedAmount?: number })
          .refundedAmount ?? 0;
        const remaining = Math.max(payment.amount - currentRefundedAmount, 0);

        if (
          payment.status !== PaymentStatus.PAID &&
          payment.status !== PaymentStatus.REFUNDED_PARTIAL
        ) {
          continue;
        }

        if (remaining <= 0) {
          continue;
        }

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.REFUNDED,
            refundedAmount: payment.amount,
          },
        });

        const refundInvoice = await tx.invoice.create({
          data: {
            userId: payment.userId,
            paymentId: null,
            total: -Math.abs(remaining),
            currency: payment.currency,
            type: InvoiceType.REFUND,
            status: InvoiceStatus.REFUNDED,
            relatedInvoiceId: payment.invoice?.id ?? null,
            providerRef: payment.providerRef,
            unitAmount: -Math.abs(remaining),
            quantity: 1,
            notes: reason,
          },
        });

        await assignInvoiceNumber({ invoiceId: refundInvoice.id, tx });

        if (payment.invoice && payment.invoice.status !== InvoiceStatus.REFUNDED) {
          await tx.invoice.update({
            where: { id: payment.invoice.id },
            data: {
              status: InvoiceStatus.REFUNDED,
              notes: reason,
            },
          });
        }
      }
    }

    await tx.enrollment.update({
      where: { id: enrollmentId },
      data: { status: "refunded" },
    });

    return { status: "ok" } as const;
  });

  if (result.status === "not_found") {
    redirect(buildRedirect(enrollmentId, { error: "not_found" }));
  }

  if (result.status === "already_refunded") {
    redirect(buildRedirect(enrollmentId, { notice: "already_refunded" }));
  }

  revalidatePath("/admin/enrollments");
  revalidatePath(`/admin/enrollments/${enrollmentId}`);
  revalidatePath("/dashboard/courses");
  revalidatePath(`/dashboard/courses/${enrollmentId}`);
  redirect(buildRedirect(enrollmentId, { notice: "refunded" }));
}

export async function overrideEnrollmentStatusAction(
  enrollmentId: string,
  formData: FormData,
) {
  await requireAdmin();

  const statusRaw = formData.get("status");
  const nextStatus = statusRaw === "pending_payment" || statusRaw === "active"
    ? statusRaw
    : null;

  if (!nextStatus) {
    redirect(buildRedirect(enrollmentId, { error: "invalid_status" }));
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, status: true },
  });

  if (!enrollment) {
    redirect(buildRedirect(enrollmentId, { error: "not_found" }));
  }

  if (enrollment.status === nextStatus) {
    redirect(buildRedirect(enrollmentId, { notice: "no_change" }));
  }

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status: nextStatus },
  });

  revalidatePath("/admin/enrollments");
  revalidatePath(`/admin/enrollments/${enrollmentId}`);
  revalidatePath("/dashboard/courses");
  revalidatePath(`/dashboard/courses/${enrollmentId}`);
  redirect(buildRedirect(enrollmentId, { notice: "status_updated" }));
}

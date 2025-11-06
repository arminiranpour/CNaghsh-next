"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { InvoiceStatus, InvoiceType, PaymentStatus } from "@prisma/client";

import { recordAuditLog } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/db";
import { CAN_PUBLISH_PROFILE } from "@/lib/billing/entitlementKeys";
import { syncSingleUser } from "@/lib/billing/entitlementSync";
import { emit } from "@/lib/billing/events";
import { assignInvoiceNumber } from "@/lib/billing/invoiceNumber";
import { sendInvoiceRefundedEmail } from "@/lib/billing/invoiceNotifications";

const reasonSchema = z
  .string({ invalid_type_error: "لطفاً دلیل را به صورت متن وارد کنید." })
  .trim()
  .min(5, "حداقل ۵ کاراکتر الزامی است.")
  .max(2000, "حداکثر ۲۰۰۰ کاراکتر مجاز است.");
const idSchema = z.string().cuid();
const timestampSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "مقدار زمان نامعتبر است.");

const PAYMENTS_PATH = "/admin/billing/payments";

function mapPaymentSnapshot(payment: {
  id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  provider: string;
  providerRef: string;
  updatedAt: Date;
}) {
  return {
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    provider: payment.provider,
    providerRef: payment.providerRef,
    updatedAt: payment.updatedAt.toISOString(),
  };
}

function mapInvoiceSnapshot(invoice: {
  id: string;
  status: InvoiceStatus;
  total: number;
  type: InvoiceType;
  number: string | null;
  issuedAt: Date;
} | null) {
  if (!invoice) {
    return null;
  }
  return {
    status: invoice.status,
    total: invoice.total,
    type: invoice.type,
    number: invoice.number,
    issuedAt: invoice.issuedAt.toISOString(),
  };
}

function failure(error: unknown) {
  if (error instanceof z.ZodError) {
    return { ok: false, error: error.issues[0]?.message ?? "درخواست نامعتبر است." } as const;
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message } as const;
  }
  return { ok: false, error: "خطای نامشخص رخ داد." } as const;
}

export async function refundPaymentAction(input: {
  id: string;
  reason: string;
  updatedAt: string;
  policy: "revoke_now" | "keep_until_end";
  idempotencyKey?: string;
}) {
  try {
    const admin = await requireAdmin();
    const parsed = {
      id: idSchema.parse(input.id),
      reason: reasonSchema.parse(input.reason),
      updatedAt: timestampSchema.parse(input.updatedAt),
      policy: input.policy === "revoke_now" ? "revoke_now" : "keep_until_end",
      idempotencyKey: input.idempotencyKey,
    } as const;

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: parsed.id },
        include: { invoice: true, user: { select: { id: true } } },
      });

      if (!payment) {
        throw new Error("پرداخت یافت نشد.");
      }

      if (payment.status === PaymentStatus.REFUNDED) {
        throw new Error("این پرداخت قبلاً بازپرداخت شده است.");
      }

      if (payment.status !== PaymentStatus.PAID) {
        throw new Error("تنها پرداخت‌های موفق قابل بازپرداخت هستند.");
      }

      if (payment.updatedAt.getTime() !== new Date(parsed.updatedAt).getTime()) {
        throw new Error("اطلاعات پرداخت تغییر کرده است. لطفاً صفحه را به‌روزرسانی کنید.");
      }

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUNDED },
      });

      const originalInvoice = payment.invoice ?? null;

      let refundInvoice = await tx.invoice.findFirst({
        where: { relatedInvoiceId: originalInvoice?.id ?? undefined, type: InvoiceType.REFUND },
      });

      const refundPayload = {
        userId: payment.userId,
        paymentId: null,
        total: -Math.abs(payment.amount),
        currency: payment.currency,
        type: InvoiceType.REFUND,
        status: InvoiceStatus.REFUNDED,
        relatedInvoiceId: originalInvoice?.id ?? null,
        providerRef: payment.providerRef,
        planId: originalInvoice?.planId ?? null,
        planName: originalInvoice?.planName ?? null,
        planCycle: originalInvoice?.planCycle ?? null,
        periodStart: originalInvoice?.periodStart ?? null,
        periodEnd: originalInvoice?.periodEnd ?? null,
        unitAmount: originalInvoice?.unitAmount
          ? -Math.abs(originalInvoice.unitAmount)
          : -Math.abs(payment.amount),
        quantity: originalInvoice?.quantity ?? 1,
        notes: parsed.reason,
      } as const;

      if (!refundInvoice) {
        refundInvoice = await tx.invoice.create({
          data: refundPayload,
        } as any);
      } else {
        refundInvoice = await tx.invoice.update({
          where: { id: refundInvoice.id },
          data: refundPayload,
        } as any);
      }

      await assignInvoiceNumber({ invoiceId: refundInvoice.id, tx });

      let updatedOriginalInvoice = originalInvoice;
      if (originalInvoice && originalInvoice.status !== InvoiceStatus.REFUNDED) {
        updatedOriginalInvoice = await tx.invoice.update({
          where: { id: originalInvoice.id },
          data: { status: InvoiceStatus.REFUNDED, notes: parsed.reason },
        } as any);
      }

      let entitlementBefore = null;
      let entitlementAfter = null;

      if (parsed.policy === "revoke_now") {
        entitlementBefore = await tx.userEntitlement.findFirst({
          where: { userId: payment.userId, key: CAN_PUBLISH_PROFILE },
          orderBy: { updatedAt: "desc" },
        });

        if (entitlementBefore) {
          entitlementAfter = await tx.userEntitlement.update({
            where: { id: entitlementBefore.id },
            data: { expiresAt: now },
          });
        }
      }

      return {
        payment,
        updatedPayment,
        originalInvoice,
        updatedOriginalInvoice,
        refundInvoice,
        entitlementBefore,
        entitlementAfter,
      };
    });

    const reconciliation =
      parsed.policy === "revoke_now" ? await syncSingleUser(result.payment.userId) : null;

    await recordAuditLog({
      actor: admin,
      resource: { type: "payment", id: result.payment.id },
      action: "ADMIN_REFUND_PAYMENT",
      reason: parsed.reason,
      before: {
        payment: mapPaymentSnapshot(result.payment),
        invoice: mapInvoiceSnapshot(result.originalInvoice),
        entitlement: result.entitlementBefore
          ? {
              id: result.entitlementBefore.id,
              expiresAt: result.entitlementBefore.expiresAt?.toISOString() ?? null,
            }
          : null,
      },
      after: {
        payment: mapPaymentSnapshot(result.updatedPayment),
        invoice: mapInvoiceSnapshot(result.updatedOriginalInvoice),
        refundInvoice: mapInvoiceSnapshot(result.refundInvoice),
        entitlement: result.entitlementAfter
          ? {
              id: result.entitlementAfter.id,
              expiresAt: result.entitlementAfter.expiresAt?.toISOString() ?? null,
            }
          : null,
      },
      metadata: {
        policy: parsed.policy,
        reconciliation,
      },
      idempotencyKey: input.idempotencyKey,
    });

    await sendInvoiceRefundedEmail({
      invoiceId: result.refundInvoice.id,
      userId: result.payment.userId,
    });

    await emit({
      type: "PAYMENT_ADMIN_REFUNDED",
      userId: result.payment.userId,
      subscriptionId: result.payment.userId,
      planId: result.payment.providerRef,
      at: new Date(),
    });

    await revalidatePath(PAYMENTS_PATH);
    await revalidatePath("/admin/billing/subscriptions");

    return { ok: true } as const;
  } catch (error) {
    return failure(error);
  }
}

export async function markPaymentFailedAction(input: {
  id: string;
  reason: string;
  updatedAt: string;
  idempotencyKey?: string;
}) {
  try {
    const admin = await requireAdmin();
    const parsed = {
      id: idSchema.parse(input.id),
      reason: reasonSchema.parse(input.reason),
      updatedAt: timestampSchema.parse(input.updatedAt),
      idempotencyKey: input.idempotencyKey,
    };

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: parsed.id },
        include: { invoice: true },
      });

      if (!payment) {
        throw new Error("پرداخت یافت نشد.");
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new Error("فقط پرداخت‌های در انتظار قابل علامت‌گذاری به‌عنوان ناموفق هستند.");
      }

      if (payment.updatedAt.getTime() !== new Date(parsed.updatedAt).getTime()) {
        throw new Error("اطلاعات پرداخت تغییر کرده است. لطفاً صفحه را تازه‌سازی کنید.");
      }

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });

      let updatedInvoice = payment.invoice ?? null;
      if (payment.invoice && payment.invoice.status !== InvoiceStatus.VOID) {
        updatedInvoice = await tx.invoice.update({
          where: { id: payment.invoice.id },
          data: { status: InvoiceStatus.VOID },
        });
      }

      return { payment, updatedPayment, invoice: updatedInvoice };
    });

    await recordAuditLog({
      actor: admin,
      resource: { type: "payment", id: result.payment.id },
      action: "ADMIN_MARK_PAYMENT_FAILED",
      reason: parsed.reason,
      before: {
        payment: mapPaymentSnapshot(result.payment),
        invoice: mapInvoiceSnapshot(result.payment.invoice ?? null),
      },
      after: {
        payment: mapPaymentSnapshot(result.updatedPayment),
        invoice: mapInvoiceSnapshot(result.invoice),
      },
      idempotencyKey: parsed.idempotencyKey,
    });

    await emit({
      type: "PAYMENT_ADMIN_MARKED_FAILED",
      userId: result.payment.userId,
      subscriptionId: result.payment.userId,
      planId: result.payment.providerRef,
      at: new Date(),
    });

    await revalidatePath(PAYMENTS_PATH);
    return { ok: true } as const;
  } catch (error) {
    return failure(error);
  }
}

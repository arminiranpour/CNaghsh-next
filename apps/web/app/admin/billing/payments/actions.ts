"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { InvoiceStatus, InvoiceType, PaymentStatus, Prisma } from "@prisma/client";

import { recordAuditLog } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/db";
import { CAN_PUBLISH_PROFILE } from "@/lib/billing/entitlementKeys";
import { syncSingleUser } from "@/lib/billing/entitlementSync";
import { emit } from "@/lib/billing/events";
import { assignInvoiceNumber } from "@/lib/billing/invoiceNumber";
import { emitBillingRefundIssued } from "@/lib/notifications/events";
import { formatJalaliDateTime } from "@/lib/datetime/jalali";
import { formatRials } from "@/lib/money";

const reasonSchema = z
  .string({ invalid_type_error: "لطفاً دلیل را به صورت متن وارد کنید." })
  .trim()
  .min(5, "حداقل ۵ کاراکتر الزامی است.")
  .max(2000, "حداکثر ۲۰۰۰ کاراکتر مجاز است.");
const idSchema = z.string().cuid();
const timestampSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "مقدار زمان نامعتبر است.");
const amountSchema = z
  .coerce
  .number({ invalid_type_error: "مبلغ بازپرداخت باید یک عدد معتبر باشد." })
  .int("مبلغ باید به صورت عدد صحیح وارد شود.")
  .positive("مبلغ بازپرداخت باید بیشتر از صفر باشد.");
const policySchema = z.enum(["revoke_now", "keep_until_end"], {
  invalid_type_error: "سیاست انتخاب شده معتبر نیست.",
});

const REFUNDED_PARTIAL_STATUS = "REFUNDED_PARTIAL" as PaymentStatus;

const PAYMENTS_PATH = "/admin/billing/payments";

function mapPaymentSnapshot(payment: {
  id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  provider: string;
  providerRef: string;
  updatedAt: Date;
  refundedAmount: number;
}) {
  return {
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    provider: payment.provider,
    providerRef: payment.providerRef,
    updatedAt: payment.updatedAt.toISOString(),
    refundedAmount: payment.refundedAmount,
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
  amount: number | string;
  idempotencyKey?: string;
}) {
  try {
    const admin = await requireAdmin();
    const parsed = {
      id: idSchema.parse(input.id),
      reason: reasonSchema.parse(input.reason),
      updatedAt: timestampSchema.parse(input.updatedAt),
      policy: policySchema.parse(input.policy),
      amount: amountSchema.parse(input.amount),
      idempotencyKey: input.idempotencyKey?.trim(),
    } as const;

    const now = new Date();

    if (parsed.idempotencyKey) {
      const existingAudit = await prisma.auditLog.findUnique({
        where: { idempotencyKey: parsed.idempotencyKey },
        select: { id: true },
      });

      if (existingAudit) {
        return { ok: true } as const;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: parsed.id },
        include: {
          invoice: {
            include: {
              refunds: {
                select: {
                  id: true,
                  total: true,
                  issuedAt: true,
                  number: true,
                },
              },
            },
          },
          user: { select: { id: true } },
        },
      });

      if (!payment) {
        throw new Error("پرداخت یافت نشد.");
      }

      const currentStatus = payment.status;

      if (currentStatus === PaymentStatus.REFUNDED) {
        throw new Error("این پرداخت قبلاً به‌طور کامل بازپرداخت شده است.");
      }

      if (currentStatus !== PaymentStatus.PAID && currentStatus !== REFUNDED_PARTIAL_STATUS) {
        throw new Error("تنها پرداخت‌های موفق قابل بازپرداخت هستند.");
      }

      if (payment.updatedAt.getTime() !== new Date(parsed.updatedAt).getTime()) {
        throw new Error("اطلاعات پرداخت تغییر کرده است. لطفاً صفحه را به‌روزرسانی کنید.");
      }

      const currentRefundedAmount = (payment as typeof payment & { refundedAmount?: number }).refundedAmount ?? 0;
      const remainingRefundable = Math.max(payment.amount - currentRefundedAmount, 0);

      if (remainingRefundable <= 0) {
        throw new Error("این پرداخت دیگر مبلغ قابل بازپرداختی ندارد.");
      }

      if (parsed.amount > remainingRefundable) {
        throw new Error("مبلغ بازپرداخت بیشتر از مقدار مجاز است.");
      }

      const nextRefundedAmount = currentRefundedAmount + parsed.amount;
      const isFullRefund = nextRefundedAmount >= payment.amount;
      const nextStatus = isFullRefund ? PaymentStatus.REFUNDED : REFUNDED_PARTIAL_STATUS;

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: nextStatus as PaymentStatus,
          refundedAmount: nextRefundedAmount,
        },
      });

      const originalInvoice = payment.invoice ?? null;

      const refundCreatePayload: Prisma.InvoiceUncheckedCreateInput = {
        userId: payment.userId,
        paymentId: null,
        total: -Math.abs(parsed.amount),
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
        unitAmount: -Math.abs(parsed.amount),
        quantity: 1,
        notes: parsed.reason,
      };
      let refundInvoice = await tx.invoice.create({
        data: refundCreatePayload,
      });

      await assignInvoiceNumber({ invoiceId: refundInvoice.id, tx });

      const refreshedRefundInvoice = await tx.invoice.findUnique({ where: { id: refundInvoice.id } });
      if (refreshedRefundInvoice) {
        refundInvoice = refreshedRefundInvoice;
      }

      const invoiceRefundInclude = {
        refunds: {
          select: {
            id: true,
            total: true,
            issuedAt: true,
            number: true,
          },
        },
      } as const;

      let updatedOriginalInvoice = originalInvoice;
      if (originalInvoice) {
        if (isFullRefund) {
          if (originalInvoice.status !== InvoiceStatus.REFUNDED) {
            updatedOriginalInvoice = await tx.invoice.update({
              where: { id: originalInvoice.id },
              data: {
                status: InvoiceStatus.REFUNDED,
                notes: parsed.reason,
              },
              include: invoiceRefundInclude,
            });
          }
        } else {
          const existingNotes = originalInvoice.notes ?? "";
          const noteEntry = `بازپرداخت جزئی ${formatRials(parsed.amount)} در ${formatJalaliDateTime(now)} — دلیل: ${parsed.reason}`;
          const mergedNotes = [existingNotes.trim(), noteEntry]
            .filter((item) => item && item.length > 0)
            .join("\n");

          updatedOriginalInvoice = await tx.invoice.update({
            where: { id: originalInvoice.id },
            data: {
              notes: mergedNotes,
            },
            include: invoiceRefundInclude,
          });
        }
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
        nextRefundedAmount,
        remainingAfter: Math.max(payment.amount - nextRefundedAmount, 0),
        isFullRefund,
      };
    });

    const reconciliation = await syncSingleUser(result.payment.userId);

    await recordAuditLog({
      actor: admin,
      resource: { type: "payment", id: result.payment.id },
      action: "ADMIN_REFUND_PAYMENT",
      reason: parsed.reason,
      before: {
        payment: mapPaymentSnapshot({
          ...result.payment,
          refundedAmount:
            (result.payment as typeof result.payment & { refundedAmount?: number }).refundedAmount ?? 0,
        }),
        invoice: mapInvoiceSnapshot(result.originalInvoice),
        entitlement: result.entitlementBefore
          ? {
              id: result.entitlementBefore.id,
              expiresAt: result.entitlementBefore.expiresAt?.toISOString() ?? null,
            }
          : null,
      },
      after: {
        payment: mapPaymentSnapshot({
          ...result.updatedPayment,
          refundedAmount: result.nextRefundedAmount,
        }),
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
        refundAmount: parsed.amount,
        remainingAfter: result.remainingAfter,
        fullRefund: result.isFullRefund,
      },
      idempotencyKey: input.idempotencyKey,
    });

    await emitBillingRefundIssued({
      userId: result.payment.userId,
      refundInvoiceId: result.refundInvoice.id,
      refundInvoiceNumber: result.refundInvoice.number ?? null,
      amount: parsed.amount,
      originalInvoiceNumber: result.updatedOriginalInvoice.number ?? null,
      policyNote:
        parsed.policy === "keep_access"
          ? "دسترسی‌های شما همچنان فعال باقی می‌ماند."
          : "با این استرداد، دسترسی مرتبط نیز لغو شد.",
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
        payment: mapPaymentSnapshot({
          ...result.payment,
          refundedAmount:
            (result.payment as typeof result.payment & { refundedAmount?: number }).refundedAmount ?? 0,
        }),
        invoice: mapInvoiceSnapshot(result.payment.invoice ?? null),
      },
      after: {
        payment: mapPaymentSnapshot({
          ...result.updatedPayment,
          refundedAmount:
            (result.updatedPayment as typeof result.updatedPayment & { refundedAmount?: number }).refundedAmount ?? 0,
        }),
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

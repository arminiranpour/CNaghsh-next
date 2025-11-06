"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { InvoiceStatus } from "@prisma/client";

import { recordAuditLog } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/auth";
import { prisma } from "@/lib/db";
import { resyncInvoiceNumber } from "@/lib/billing/invoiceNumber";

const idSchema = z.string().cuid();
const reasonSchema = z
  .string({ invalid_type_error: "لطفاً توضیح معتبری وارد کنید." })
  .trim()
  .min(5, "حداقل ۵ کاراکتر الزامی است.")
  .max(500, "حداکثر ۵۰۰ کاراکتر مجاز است.");

const INVOICES_PATH = "/admin/billing/invoices";

function formatInvoiceSnapshot(invoice: {
  id: string;
  number: string | null;
  status: InvoiceStatus;
  total: number;
  issuedAt: Date;
}) {
  return {
    number: invoice.number,
    status: invoice.status,
    total: invoice.total,
    issuedAt: invoice.issuedAt.toISOString(),
  };
}

export async function resyncInvoiceNumberAction({ id }: { id: string }) {
  const admin = await requireAdmin();
  const parsedId = idSchema.parse(id);

  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: parsedId } });
    if (!invoice) {
      throw new Error("فاکتور یافت نشد.");
    }

    const newNumber = await resyncInvoiceNumber({ invoiceId: parsedId, tx });
    const updated = await tx.invoice.findUnique({ where: { id: parsedId } });
    if (!updated) {
      throw new Error("فاکتور پس از به‌روزرسانی یافت نشد.");
    }

    return { before: invoice, after: updated, number: newNumber };
  });

  await recordAuditLog({
    actor: admin,
    action: "ADMIN_RESYNC_INVOICE_NUMBER",
    reason: "resync_invoice_number",
    resource: { type: "invoice", id: parsedId },
    before: { invoice: formatInvoiceSnapshot(result.before) },
    after: { invoice: formatInvoiceSnapshot(result.after) },
  });

  await revalidatePath(INVOICES_PATH);
  return { ok: true } as const;
}

export async function voidInvoiceAction({ id, reason }: { id: string; reason: string }) {
  const admin = await requireAdmin();
  const parsedId = idSchema.parse(id);
  const parsedReason = reasonSchema.parse(reason);

  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: parsedId } });
    if (!invoice) {
      throw new Error("فاکتور یافت نشد.");
    }

    if (invoice.status === InvoiceStatus.VOID) {
      throw new Error("این فاکتور قبلاً باطل شده است.");
    }

    const updated = await tx.invoice.update({
      where: { id: parsedId },
      data: { status: InvoiceStatus.VOID, notes: parsedReason },
    } as any);

    return { before: invoice, after: updated };
  });

  await recordAuditLog({
    actor: admin,
    action: "ADMIN_VOID_INVOICE",
    reason: parsedReason,
    resource: { type: "invoice", id: parsedId },
    before: { invoice: formatInvoiceSnapshot(result.before) },
    after: { invoice: formatInvoiceSnapshot(result.after) },
  });

  await revalidatePath(INVOICES_PATH);
  return { ok: true } as const;
}

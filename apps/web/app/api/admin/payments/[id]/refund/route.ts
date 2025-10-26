import { NextRequest } from "next/server";
import { InvoiceStatus, InvoiceType, PaymentStatus } from "@prisma/client";
import { z } from "zod";

import { findAdminUser } from "@/lib/admin/ensureAdmin";
import { syncSingleUser } from "@/lib/billing/entitlementSync";
import { markExpired } from "@/lib/billing/subscriptionService";
import { badRequest, notFound, ok, unauthorized } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({ id: z.string().cuid() });
const bodySchema = z.object({ amount: z.number().int().positive().optional() });

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await findAdminUser(request);
  if (!admin) {
    return unauthorized("Admin required");
  }

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return badRequest("Invalid payment id");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: parsedParams.data.id },
    include: { invoice: true },
  });

  if (!payment) {
    return notFound("Payment not found");
  }

  const parsedBody = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsedBody.success) {
    return badRequest("Invalid payload");
  }

  const refundAmount = parsedBody.data.amount ?? payment.amount;
  const absoluteAmount = Math.abs(refundAmount);

  let refundInvoiceId: string | null = null;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.REFUNDED },
    });

    const existingInvoice = await tx.invoice.findUnique({ where: { paymentId: payment.id } });
    const now = new Date();

    if (existingInvoice) {
      const updated = await tx.invoice.update({
        where: { id: existingInvoice.id },
        data: {
          type: InvoiceType.REFUND,
          total: -absoluteAmount,
          status: InvoiceStatus.PAID,
          issuedAt: now,
          providerRef: payment.providerRef,
        },
      });
      refundInvoiceId = updated.id;
    } else {
      const created = await tx.invoice.create({
        data: {
          paymentId: payment.id,
          userId: payment.userId,
          type: InvoiceType.REFUND,
          total: -absoluteAmount,
          currency: payment.currency,
          status: InvoiceStatus.PAID,
          providerRef: payment.providerRef,
          issuedAt: now,
        },
      });
      refundInvoiceId = created.id;
    }
  });

  if (absoluteAmount >= payment.amount) {
    await markExpired({ userId: payment.userId });
    await syncSingleUser(payment.userId);
  }

  return ok({ paymentId: payment.id, refundInvoiceId });
}

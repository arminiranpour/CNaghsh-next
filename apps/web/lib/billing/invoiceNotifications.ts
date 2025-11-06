import { InvoiceStatus, InvoiceType } from "@prisma/client";

import { formatInvoiceCurrency, formatInvoiceJalaliDate } from "@/lib/billing/invoiceFormat";
import { prisma } from "@/lib/prisma";
import { buildAbsoluteUrl } from "@/lib/url";
import { sendEmail } from "@/lib/notifications/email";

const invoiceStatusTitle: Record<InvoiceStatus, string> = {
  DRAFT: "پیش‌فاکتور",
  PAID: "فاکتور",
  VOID: "باطل‌شده",
  REFUNDED: "یادداشت بستانکاری",
};

const invoiceTypeTitle: Record<InvoiceType, string> = {
  SALE: "فروش",
  REFUND: "استرداد",
};

type InvoiceEmailContext = {
  invoiceId: string;
  userId: string;
};

const buildPdfLink = (invoiceId: string) => buildAbsoluteUrl(`/api/invoices/${invoiceId}/pdf`);

async function loadInvoiceDetails(invoiceId: string) {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      number: true,
      issuedAt: true,
      total: true,
      status: true,
      type: true,
      userId: true,
    },
  });
}

export async function sendInvoiceFinalizedEmail({ invoiceId, userId }: InvoiceEmailContext) {
  try {
    const invoice = await loadInvoiceDetails(invoiceId);
    if (!invoice || invoice.userId !== userId) {
      return;
    }

    const title = invoiceStatusTitle[invoice.status];
    const typeLabel = invoiceTypeTitle[invoice.type];
    const numberLabel = invoice.number ? ` شماره ${invoice.number}` : "";
    const issued = formatInvoiceJalaliDate(invoice.issuedAt);
    const amount = formatInvoiceCurrency(invoice.total);
    const link = buildPdfLink(invoice.id);

    const body = [
      `${title}${numberLabel} شما با موفقیت صادر شد.`,
      `نوع: ${typeLabel}`,
      `تاریخ صدور: ${issued}`,
      `مبلغ کل: ${amount}`,
      `برای مشاهده و دانلود PDF به لینک زیر مراجعه کنید:`,
      link,
    ].join("<br />");

    await sendEmail(userId, `${title} جدید شما آماده است`, body);
  } catch (error) {
    console.error("invoice_finalized_email_failed", error);
  }
}

export async function sendInvoiceRefundedEmail({ invoiceId, userId }: InvoiceEmailContext) {
  try {
    const invoice = await loadInvoiceDetails(invoiceId);
    if (!invoice || invoice.userId !== userId) {
      return;
    }

    const issued = formatInvoiceJalaliDate(invoice.issuedAt);
    const amount = formatInvoiceCurrency(invoice.total);
    const link = buildPdfLink(invoice.id);

    const body = [
      `استرداد با شماره ${invoice.number ?? invoice.id} برای شما ثبت شد.`,
      `تاریخ ثبت: ${issued}`,
      `مبلغ استرداد: ${amount}`,
      `جزئیات کامل در فایل PDF زیر در دسترس است:`,
      link,
    ].join("<br />");

    await sendEmail(userId, "استرداد شما ثبت شد", body);
  } catch (error) {
    console.error("invoice_refund_email_failed", error);
  }
}

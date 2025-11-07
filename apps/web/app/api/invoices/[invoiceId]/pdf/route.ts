export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth/session";
import { getInvoiceForPdf } from "@/lib/billing/invoiceQueries";
import { generateInvoicePdf, type InvoicePdfRecord } from "@/lib/billing/invoicePdf";
import {
  InvoiceStatus as InvoiceStatusEnum,
  type InvoiceStatus,
} from "@/lib/prismaEnums";

const CACHE_CONTROL_FINALIZED = "public, max-age=3600, stale-while-revalidate=86400";
const CACHE_CONTROL_DRAFT = "no-store";

export async function GET(
  _request: Request,
  context: { params: { invoiceId: string } },
) {
  const session = await getServerAuthSession();
  const user = session?.user;

  if (!user || typeof user.id !== "string") {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": CACHE_CONTROL_DRAFT } },
    );
  }

  const invoiceId = context.params.invoiceId;

  if (!invoiceId) {
    return NextResponse.json(
      { error: "INVALID_INVOICE" },
      { status: 400, headers: { "Cache-Control": CACHE_CONTROL_DRAFT } },
    );
  }

  const invoice = await getInvoiceForPdf(invoiceId);

  if (!invoice) {
    return NextResponse.json(
      { error: "NOT_FOUND" },
      { status: 404, headers: { "Cache-Control": CACHE_CONTROL_DRAFT } },
    );
  }

  const isOwner = invoice.userId === user.id;
  const isAdmin = (user as any).role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "FORBIDDEN" },
      { status: 403, headers: { "Cache-Control": CACHE_CONTROL_DRAFT } },
    );
  }

  // generateInvoicePdf returns a Node Buffer (Uint8Array)
  const pdfBuffer = await generateInvoicePdf(invoice as InvoicePdfRecord);
  const pdfBytes = new Uint8Array(
    pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength,
    ),
  );
  const pdfArrayBuffer: ArrayBuffer = pdfBytes.buffer;
  const filename = `${invoice.number ?? invoice.id}.pdf`;

  const finalizedStatuses = new Set<InvoiceStatus>([
    InvoiceStatusEnum.PAID,
    InvoiceStatusEnum.REFUNDED,
    InvoiceStatusEnum.VOID,
  ]);

  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
    "Cache-Control": finalizedStatuses.has(invoice.status as InvoiceStatus)
      ? CACHE_CONTROL_FINALIZED
      : CACHE_CONTROL_DRAFT,
  });

  return new NextResponse(pdfArrayBuffer, { status: 200, headers });
}





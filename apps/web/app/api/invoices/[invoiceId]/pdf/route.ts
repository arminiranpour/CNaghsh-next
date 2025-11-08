export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth/session";
import { getInvoiceForPdf } from "@/lib/billing/invoiceQueries";
import { generateInvoicePdf, type InvoicePdfRecord } from "@/lib/billing/invoicePdf";

const CACHE_CONTROL_FINALIZED = "public, max-age=3600, stale-while-revalidate=86400";
const CACHE_CONTROL_DRAFT = "no-store";

// Use string values to avoid enum width/overlap issues across layers
const FINALIZED_STATUSES = new Set<string>(["PAID", "REFUNDED", "VOID"]);

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
  const isAdmin = user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "FORBIDDEN" },
      { status: 403, headers: { "Cache-Control": CACHE_CONTROL_DRAFT } },
    );
  }

  try {
    const pdfBuffer = await generateInvoicePdf(invoice as InvoicePdfRecord);

    const filename = `${invoice.number ?? invoice.id}.pdf`;
    const cacheControl = FINALIZED_STATUSES.has(String(invoice.status))
      ? CACHE_CONTROL_FINALIZED
      : CACHE_CONTROL_DRAFT;

    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": cacheControl,
    });

    const pdfArrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength,
    );

    return new NextResponse(pdfArrayBuffer, { status: 200, headers });
  } catch (error) {
    console.error("[invoice-pdf] Failed to render invoice PDF", {
      invoiceId,
      error,
    });

    return NextResponse.json(
      { error: "PDF_RENDER_FAILED" },
      { status: 500, headers: { "Cache-Control": CACHE_CONTROL_DRAFT } },
    );
  }
}

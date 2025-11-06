import { prisma } from "@/lib/prisma";

export function getInvoiceForPdf(invoiceId: string) {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      user: { select: { id: true, email: true, name: true } },
      payment: {
        select: {
          id: true,
          provider: true,
          providerRef: true,
          status: true,
          session: {
            select: {
              price: {
                select: {
                  id: true,
                  amount: true,
                  currency: true,
                  plan: {
                    select: {
                      id: true,
                      name: true,
                      cycle: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      relatedInvoice: {
        select: { id: true, number: true, type: true },
      },
      refunds: {
        select: { id: true, number: true, status: true },
      },
    },
  });
}

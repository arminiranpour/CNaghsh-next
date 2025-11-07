import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const INVOICE_PREFIX = "INV";
const DAILY_SEQUENCE_LENGTH = 4;

const isUniqueConstraint = (error: unknown): boolean => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
};

const padSequence = (value: number): string => {
  return value.toString().padStart(DAILY_SEQUENCE_LENGTH, "0");
};

const formatDateForNumber = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  return `${year}${month}${day}`;
};

const startOfDayUtc = (date: Date): Date => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

type TransactionClient = Prisma.TransactionClient;

const nextSequenceValue = async (
  tx: TransactionClient,
  issuedAt: Date,
): Promise<number> => {
  const day = startOfDayUtc(issuedAt);
  const [row] = await tx.$queryRaw<{ counter: number }[]>`
    INSERT INTO "InvoiceSequence" ("sequenceDate", "counter", "createdAt", "updatedAt")
    VALUES (${day}, 1, NOW(), NOW())
    ON CONFLICT ("sequenceDate")
    DO UPDATE SET "counter" = "InvoiceSequence"."counter" + 1, "updatedAt" = NOW()
    RETURNING "counter";
  `;

  if (!row || typeof row.counter !== "number") {
    throw new Error("FAILED_TO_ALLOCATE_INVOICE_SEQUENCE");
  }

  return row.counter;
};

const buildInvoiceNumber = (issuedAt: Date, sequence: number): string => {
  return `${INVOICE_PREFIX}-${formatDateForNumber(issuedAt)}-${padSequence(sequence)}`;
};

export type AssignInvoiceNumberOptions = {
  invoiceId: string;
  issuedAt?: Date;
  tx?: TransactionClient;
  force?: boolean;
};

const runWithTransaction = async <T>(
  tx: TransactionClient | undefined,
  callback: (transaction: TransactionClient) => Promise<T>,
) => {
  if (tx) {
    return callback(tx);
  }

  return prisma.$transaction((transaction) => callback(transaction));
};

export async function assignInvoiceNumber({
  invoiceId,
  issuedAt,
  tx,
  force = false,
}: AssignInvoiceNumberOptions): Promise<string> {
  return runWithTransaction(tx, async (transaction) => {
    const invoice = await transaction.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, number: true, issuedAt: true },
    });

    if (!invoice) {
      throw new Error("INVOICE_NOT_FOUND");
    }

    if (invoice.number && !force) {
      return invoice.number;
    }

    const finalIssuedAt = issuedAt ?? invoice.issuedAt ?? new Date();
    let attempt = 0;

    while (attempt < 6) {
      const counter = await nextSequenceValue(transaction, finalIssuedAt);
      const candidate = buildInvoiceNumber(finalIssuedAt, counter);

      try {
        const updated = await transaction.invoice.update({
          where: { id: invoiceId },
          data: { number: candidate, issuedAt: finalIssuedAt },
          select: { number: true },
        });

        if (!updated.number) {
          throw new Error("INVOICE_NUMBER_NOT_ASSIGNED");
        }

        return updated.number;
      } catch (error) {
        if (isUniqueConstraint(error)) {
          attempt += 1;
          continue;
        }
        throw error;
      }
    }

    throw new Error("INVOICE_NUMBER_ALLOCATION_FAILED");
  });
}

export async function resyncInvoiceNumber({
  invoiceId,
  tx,
}: {
  invoiceId: string;
  tx?: TransactionClient;
}): Promise<string> {
  return assignInvoiceNumber({ invoiceId, tx, force: true });
}

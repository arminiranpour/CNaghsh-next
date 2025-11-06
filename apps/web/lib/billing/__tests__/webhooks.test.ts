/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { afterAll, describe, beforeEach, expect, it, vi } from "vitest";

const applyPaymentToJobCreditsMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ applied: false as const, reason: "NOT_JOB_PRODUCT" as const }),
);

vi.mock("@/lib/billing/paymentToJobCredits", () => ({
  applyPaymentToJobCredits: applyPaymentToJobCreditsMock,
}));

type ProviderName = "zarinpal" | "idpay" | "nextpay";

function createTestPrisma() {
  let idCounter = 1;
  const nextId = (prefix: string) => `${prefix}_${idCounter++}`;

  type PaymentRecord = {
    id: string;
    provider: string;
    providerRef: string;
    status: string;
    amount: number;
    currency: string;
    userId: string;
    checkoutSessionId: string;
  };

  type InvoiceRecord = {
    id: string;
    paymentId: string;
    userId: string;
    total: number;
    currency: string;
    status: string;
    type: string;
    providerRef?: string | null;
    number?: string | null;
    issuedAt: Date;
    relatedInvoiceId?: string | null;
    planId?: string | null;
    planName?: string | null;
    planCycle?: string | null;
    periodStart?: Date | null;
    periodEnd?: Date | null;
    unitAmount?: number | null;
    quantity?: number | null;
    notes?: string | null;
  };

  type SessionRecord = {
    id: string;
    userId: string;
    provider: string;
    priceId: string;
    status: string;
    providerCallbackPayload?: Prisma.JsonValue | null;
  };

  type PriceRecord = {
    id: string;
    amount: number;
    currency: string;
  };

  type UserRecord = {
    id: string;
    role: string;
  };

  type WebhookLog = {
    id: string;
    provider: string;
    externalId: string;
    status?: string | null;
    payload: Prisma.JsonValue;
    signature?: string | null;
    eventType?: string | null;
    handledAt?: Date | null;
    paymentId?: string | null;
  };

  const logsByKey = new Map<string, WebhookLog>();
  const logsById = new Map<string, WebhookLog>();
  const payments = new Map<string, PaymentRecord>();
  const paymentsById = new Map<string, PaymentRecord>();
  const invoices = new Map<string, InvoiceRecord>();
  const sessions = new Map<string, SessionRecord>();
  const prices = new Map<string, PriceRecord>();
  const users = new Map<string, UserRecord>();

  const uniqueError = () =>
    new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "test",
    });

  const prismaMock = {
    paymentWebhookLog: {
      create: async ({ data }: { data: any }) => {
        const key = `${data.provider}|${data.externalId}`;
        if (logsByKey.has(key)) {
          throw uniqueError();
        }
        const record: WebhookLog = {
          id: nextId("log"),
          provider: data.provider,
          externalId: data.externalId,
          status: data.status,
          payload: data.payload,
          signature: data.signature ?? null,
          eventType: data.eventType ?? null,
          handledAt: data.handledAt ?? null,
          paymentId: data.paymentId ?? null,
        };
        logsByKey.set(key, record);
        logsById.set(record.id, record);
        return { ...record };
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const existing = logsById.get(where.id);
        if (!existing) {
          throw new Error("Log not found");
        }
        const updated: WebhookLog = { ...existing, ...data };
        logsById.set(updated.id, updated);
        logsByKey.set(`${updated.provider}|${updated.externalId}`, updated);
        return { ...updated };
      },
      updateMany: async ({ where, data }: { where: any; data: any }) => {
        let count = 0;
        for (const record of logsById.values()) {
          if (
            record.provider === where.provider &&
            record.externalId === where.externalId
          ) {
            const updated: WebhookLog = { ...record, ...data };
            logsById.set(updated.id, updated);
            logsByKey.set(`${updated.provider}|${updated.externalId}`, updated);
            count += 1;
          }
        }
        return { count };
      },
    },
    payment: {
      upsert: async ({ where, create, update }: any) => {
        const key = `${where.provider_providerRef.provider}|${where.provider_providerRef.providerRef}`;
        const existing = payments.get(key);
        if (existing) {
          const merged: PaymentRecord = {
            ...existing,
            status: update.status,
            amount: update.amount,
            currency: update.currency,
            userId: update.userId,
            checkoutSessionId: update.checkoutSessionId,
          };
          payments.set(key, merged);
          paymentsById.set(merged.id, merged);
          return { ...merged };
        }
        const created: PaymentRecord = {
          id: nextId("pay"),
          provider: create.provider,
          providerRef: create.providerRef,
          status: create.status,
          amount: create.amount,
          currency: create.currency,
          userId: create.userId,
          checkoutSessionId: create.checkoutSessionId,
        };
        payments.set(key, created);
        paymentsById.set(created.id, created);
        return { ...created };
      },
      findUnique: async ({ where, include }: any) => {
        const record = paymentsById.get(where.id);
        if (!record) {
          return null;
        }

        const base: any = { ...record };

        if (include?.session) {
          const session = sessions.get(record.checkoutSessionId) ?? null;

          if (!session) {
            base.session = null;
          } else {
            const sessionResult: any = { ...session };

            if (include.session.include?.price) {
              const price = prices.get(session.priceId) ?? null;
              if (!price) {
                sessionResult.price = null;
              } else {
                const priceResult: any = { ...price };
                sessionResult.price = priceResult;
              }
            }

            base.session = sessionResult;
          }
        }

        return base;
      },
    },
    invoice: {
      findUnique: async ({ where, select }: { where: { paymentId?: string; id?: string }; select?: Record<string, boolean> }) => {
        let record: InvoiceRecord | undefined;
        if (where.id) {
          record = invoices.get(where.id);
        } else if (where.paymentId) {
          record = Array.from(invoices.values()).find((item) => item.paymentId === where.paymentId);
        }
        if (!record) {
          return null;
        }
        if (!select) {
          return { ...record };
        }
        const result: Record<string, unknown> = {};
        for (const key of Object.keys(select)) {
          if (select[key]) {
            result[key] = (record as any)[key];
          }
        }
        return result;
      },
      findFirst: async ({ where }: { where: { relatedInvoiceId?: string; type?: string } }) => {
        const match = Array.from(invoices.values()).find((item) => {
          if (where.relatedInvoiceId && item.relatedInvoiceId !== where.relatedInvoiceId) {
            return false;
          }
          if (where.type && item.type !== where.type) {
            return false;
          }
          return true;
        });
        return match ? { ...match } : null;
      },
      create: async ({ data }: { data: any }) => {
        for (const record of invoices.values()) {
          if (record.paymentId && data.paymentId && record.paymentId === data.paymentId) {
            throw uniqueError();
          }
        }
        const created: InvoiceRecord = {
          id: nextId("inv"),
          paymentId: data.paymentId ?? "",
          userId: data.userId,
          total: data.total,
          currency: data.currency,
          status: data.status,
          type: data.type,
          providerRef: data.providerRef ?? null,
          issuedAt: data.issuedAt ? new Date(data.issuedAt) : new Date(),
          number: data.number ?? null,
          relatedInvoiceId: data.relatedInvoiceId ?? null,
          planId: data.planId ?? null,
          planName: data.planName ?? null,
          planCycle: data.planCycle ?? null,
          periodStart: data.periodStart ? new Date(data.periodStart) : null,
          periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
          unitAmount: data.unitAmount ?? null,
          quantity: data.quantity ?? null,
          notes: data.notes ?? null,
        };
        invoices.set(created.id, created);
        return { ...created };
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const existing = invoices.get(where.id);
        if (!existing) {
          throw new Error("Invoice not found");
        }
        const updated: InvoiceRecord = {
          ...existing,
          ...data,
          issuedAt: data.issuedAt ? new Date(data.issuedAt) : existing.issuedAt,
          periodStart: data.periodStart ? new Date(data.periodStart) : existing.periodStart ?? null,
          periodEnd: data.periodEnd ? new Date(data.periodEnd) : existing.periodEnd ?? null,
          number: data.number ?? existing.number ?? null,
          unitAmount: typeof data.unitAmount === "number" ? data.unitAmount : existing.unitAmount ?? null,
          quantity: typeof data.quantity === "number" ? data.quantity : existing.quantity ?? null,
          notes: data.notes ?? existing.notes ?? null,
        };
        invoices.set(updated.id, updated);
        return { ...updated };
      },
    },
    checkoutSession: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const record = sessions.get(where.id);
        return record ? { ...record } : null;
      },
      update: async ({ where, data }: { where: { id: string }; data: any }) => {
        const existing = sessions.get(where.id);
        if (!existing) {
          throw new Error("Session not found");
        }
        const updated: SessionRecord = { ...existing, ...data };
        sessions.set(where.id, updated);
        return { ...updated };
      },
    },
    price: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const record = prices.get(where.id);
        return record ? { ...record } : null;
      },
    },
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const record = users.get(where.id);
        return record ? { ...record } : null;
      },
    },
    $queryRaw: async () => [{ counter: invoices.size + 1 }],
    $transaction: async (callback: (tx: any) => Promise<any>) => callback(prismaMock),
  };

  return {
    prisma: prismaMock,
    reset: () => {
      logsByKey.clear();
      logsById.clear();
      payments.clear();
      paymentsById.clear();
      invoices.clear();
      sessions.clear();
      prices.clear();
      users.clear();
      idCounter = 1;
    },
    state: {
      logsById,
      paymentsById,
      invoices,
    },
    helpers: {
      createUser: ({ id = nextId("user"), role = "USER" } = {}) => {
        const user: UserRecord = { id, role };
        users.set(id, user);
        return user;
      },
      createPrice: ({
        id = nextId("price"),
        amount,
        currency = "IRR",
      }: {
        id?: string;
        amount: number;
        currency?: string;
      }) => {
        const price: PriceRecord = { id, amount, currency };
        prices.set(id, price);
        return price;
      },
      createSession: ({
        id = nextId("session"),
        userId,
        provider,
        priceId,
      }: {
        id?: string;
        userId: string;
        provider: string;
        priceId: string;
      }) => {
        const session: SessionRecord = {
          id,
          userId,
          provider,
          priceId,
          status: "STARTED",
        };
        sessions.set(id, session);
        return session;
      },
    },
  } as const;
}

const testDb = vi.hoisted(createTestPrisma);

vi.mock("@/lib/prisma", () => ({ prisma: testDb.prisma }));

const ORIGINAL_WEBHOOK_BASE_URL = process.env.PUBLIC_BASE_URL;

if (!process.env.PUBLIC_BASE_URL) {
  const fallbackBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.BASE_URL ??
    process.env.NEXTAUTH_URL ??
    undefined;

  if (fallbackBaseUrl) {
    process.env.PUBLIC_BASE_URL = fallbackBaseUrl;
  }

  if (!process.env.PUBLIC_BASE_URL) {
    throw new Error("PUBLIC_BASE_URL (or equivalent) must be set before running webhook tests.");
  }
}

afterAll(() => {
  if (ORIGINAL_WEBHOOK_BASE_URL === undefined) {
    delete process.env.PUBLIC_BASE_URL;
  } else {
    process.env.PUBLIC_BASE_URL = ORIGINAL_WEBHOOK_BASE_URL;
  }
});

const { runWebhookSimulation, handleWebhook } = await import("@/app/api/webhooks/shared");

const getWebhookBaseUrl = () => {
  const baseUrl =
    process.env.PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.BASE_URL ??
    process.env.NEXTAUTH_URL;

  if (!baseUrl) {
    throw new Error("PUBLIC_BASE_URL (or equivalent) must be defined for webhook tests.");
  }

  return baseUrl;
};

const buildRequest = (payload: unknown, signature: string) => {
  const requestUrl = new URL(
    "/api/webhooks/zarinpal",
    `${getWebhookBaseUrl().replace(/\/+$/, "")}/`,
  ).toString();

  return new NextRequest(requestUrl, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: new Headers({
      "content-type": "application/json",
      "x-webhook-signature": signature,
    }),
  });
};

describe("billing webhooks", () => {
  beforeEach(() => {
    testDb.reset();
    process.env.ZARINPAL_WEBHOOK_SECRET = "secret";
    process.env.IDPAY_WEBHOOK_SECRET = "idsecret";
    process.env.NEXTPAY_WEBHOOK_SECRET = "nextsecret";
    applyPaymentToJobCreditsMock.mockReset();
    applyPaymentToJobCreditsMock.mockResolvedValue({
      applied: false,
      reason: "NOT_JOB_PRODUCT",
    });
  });

  const seedSession = (provider: ProviderName, amount = 5000) => {
    const user = testDb.helpers.createUser();
    const price = testDb.helpers.createPrice({ amount });
    const session = testDb.helpers.createSession({
      userId: user.id,
      provider,
      priceId: price.id,
    });
    return { user, price, session };
  };

  it("creates payment and invoice for first paid webhook", async () => {
    const { session, price } = seedSession("zarinpal", 7500);

    const payload = {
      sessionId: session.id,
      authority: "AUTH-1",
      ref_id: "REF-1",
      status: "OK",
      amount: price.amount,
    };

    const result = await runWebhookSimulation("zarinpal", payload);

    expect(result.idempotent).toBe(false);
    expect(testDb.state.paymentsById.size).toBe(1);
    expect(testDb.state.invoices.size).toBe(1);
    const invoice = Array.from(testDb.state.invoices.values())[0];
    expect(invoice.total).toBe(price.amount);
  });

  it("treats duplicate external ids as idempotent", async () => {
    const { session } = seedSession("zarinpal");

    const payload = {
      sessionId: session.id,
      authority: "AUTH-1",
      ref_id: "REF-1",
      status: "OK",
      amount: 5000,
    };

    await runWebhookSimulation("zarinpal", payload);
    const result = await runWebhookSimulation("zarinpal", payload);

    expect(result.idempotent).toBe(true);
    expect(testDb.state.paymentsById.size).toBe(1);
    expect(testDb.state.invoices.size).toBe(1);
    expect(testDb.state.logsById.size).toBe(1);
  });

  it("reuses payment when providerRef repeats with new external id", async () => {
    const { session } = seedSession("zarinpal");

    const firstPayload = {
      sessionId: session.id,
      authority: "AUTH-1",
      ref_id: "REF-1",
      status: "OK",
      amount: 5000,
    };

    const secondPayload = {
      sessionId: session.id,
      authority: "AUTH-2",
      ref_id: "REF-1",
      status: "OK",
      amount: 5000,
    };

    await runWebhookSimulation("zarinpal", firstPayload);
    const result = await runWebhookSimulation("zarinpal", secondPayload);

    expect(result.idempotent).toBe(false);
    expect(testDb.state.paymentsById.size).toBe(1);
    expect(testDb.state.invoices.size).toBe(1);
  });

  it("marks payments as failed without creating invoices", async () => {
    const { session } = seedSession("idpay");

    const payload = {
      sessionId: session.id,
      id: "ID-1",
      track_id: "TRACK-1",
      status: -1,
      amount: 4000,
    };

    const result = await runWebhookSimulation("idpay", payload);

    expect(result.idempotent).toBe(false);
    expect(testDb.state.paymentsById.size).toBe(1);
    expect(testDb.state.invoices.size).toBe(0);
    const payment = Array.from(testDb.state.paymentsById.values())[0];
    expect(payment.status).toBe("FAILED");
  });

  it("logs invalid signature attempts without touching payments", async () => {
    const { session } = seedSession("zarinpal");

    const payload = {
      sessionId: session.id,
      authority: "AUTH-1",
      ref_id: "REF-1",
      status: "OK",
      amount: 5000,
    };

    const request = buildRequest(payload, "wrong-secret");
    const response = await handleWebhook(request, "zarinpal");

    expect(response.status).toBe(400);
    expect(testDb.state.paymentsById.size).toBe(0);
    expect(testDb.state.invoices.size).toBe(0);
    expect(testDb.state.logsById.size).toBe(1);
    const log = Array.from(testDb.state.logsById.values())[0];
    expect(log.status).toBe("invalid");
  });
});

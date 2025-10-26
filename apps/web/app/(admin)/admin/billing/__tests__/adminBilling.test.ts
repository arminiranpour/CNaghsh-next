import { NextRequest } from "next/server";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { CAN_PUBLISH_PROFILE } from "@/lib/billing/entitlementKeys";

const ADMIN_SESSION = { user: { id: "admin", role: "ADMIN" } } as const;

type UserRecord = { id: string; email: string; name?: string | null };
type PlanRecord = { id: string; name: string };
type SubscriptionRecord = {
  id: string;
  userId: string;
  planId: string;
  status: "active" | "expired" | "canceled" | "renewing";
  endsAt: Date;
  cancelAtPeriodEnd: boolean;
  updatedAt: Date;
};
type PaymentRecord = {
  id: string;
  userId: string;
  provider: string;
  providerRef: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  createdAt: Date;
};
type InvoiceRecord = {
  id: string;
  paymentId: string;
  userId: string;
  number: string;
  type: "SALE" | "REFUND";
  total: number;
  currency: string;
  status: "OPEN" | "PAID" | "VOID";
  issuedAt: Date;
  providerRef: string | null;
};
type EntitlementRecord = {
  id: string;
  userId: string;
  key: typeof CAN_PUBLISH_PROFILE;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type TestStore = ReturnType<typeof createTestStore>;

type SubscriptionWhereUniqueInput = { id?: string; userId?: string };
type SubscriptionInclude = { plan?: boolean; user?: boolean };
type SubscriptionFindUniqueArgs = {
  where: SubscriptionWhereUniqueInput;
  include?: SubscriptionInclude;
};
type SerializedSubscriptionRecord = Omit<SubscriptionRecord, "endsAt" | "updatedAt"> & {
  endsAt: string;
  updatedAt: string;
  plan?: PlanRecord | null;
  user?: UserRecord | null;
};

type PaymentWhereUniqueInput = { id: string };
type PaymentInclude = { invoice?: boolean };
type PaymentFindUniqueArgs = { where: PaymentWhereUniqueInput; include?: PaymentInclude };
type PaymentUpdateArgs = { where: PaymentWhereUniqueInput; data: Partial<PaymentRecord> };
type SerializedPaymentRecord = Omit<PaymentRecord, "createdAt"> & {
  createdAt: string;
  invoice?: Pick<InvoiceRecord, "id" | "number" | "type"> | null;
};

type InvoiceWhereUniqueInput = { paymentId?: string; id?: string };
type InvoiceFindUniqueArgs = { where: InvoiceWhereUniqueInput };
type InvoiceCreateData = {
  paymentId: string;
  userId: string;
  number?: string;
  type: InvoiceRecord["type"];
  total: number;
  currency: string;
  status: InvoiceRecord["status"];
  issuedAt?: Date | string;
  providerRef?: string | null;
};
type InvoiceCreateArgs = { data: InvoiceCreateData };
type InvoiceUpdateArgs = { where: { id: string }; data: Partial<Omit<InvoiceRecord, "id">> };
type InvoiceSearchClause = {
  number?: { contains: string };
  providerRef?: { contains: string };
  user?: { email?: { contains: string } };
};
type InvoiceFindManyArgs = {
  where?: {
    type?: InvoiceRecord["type"];
    status?: InvoiceRecord["status"];
    OR?: InvoiceSearchClause[];
    issuedAt?: { gte?: string; lte?: string };
  };
  orderBy?: { issuedAt?: "asc" | "desc" };
  include?: { user?: boolean };
};
type SerializedInvoiceRecord = Omit<InvoiceRecord, "issuedAt"> & {
  issuedAt: string;
  user?: UserRecord | null;
};

type UserEntitlementWhereInput = { userId?: string; key?: EntitlementRecord["key"] };
type UserEntitlementOrderBy = { updatedAt?: "asc" | "desc"; expiresAt?: "asc" | "desc" };
type UserEntitlementFindFirstArgs = { where: UserEntitlementWhereInput; orderBy?: UserEntitlementOrderBy };
type UserEntitlementCreateArgs = {
  data: { userId: string; key: EntitlementRecord["key"]; expiresAt?: Date | string | null };
};
type UserEntitlementUpdateArgs = {
  where: { id: string };
  data: { expiresAt?: Date | string | null };
};
type UserEntitlementFindManyArgs = { where: UserEntitlementWhereInput };
type SerializedEntitlementRecord = Omit<EntitlementRecord, "expiresAt" | "createdAt" | "updatedAt"> & {
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TestPrismaClient = {
  subscription: {
    findUnique(args: SubscriptionFindUniqueArgs): Promise<SerializedSubscriptionRecord | null>;
  };
  payment: {
    findUnique(args: PaymentFindUniqueArgs): Promise<SerializedPaymentRecord | null>;
    update(args: PaymentUpdateArgs): Promise<PaymentRecord>;
  };
  invoice: {
    findUnique(args: InvoiceFindUniqueArgs): Promise<SerializedInvoiceRecord | null>;
    create(args: InvoiceCreateArgs): Promise<SerializedInvoiceRecord>;
    update(args: InvoiceUpdateArgs): Promise<SerializedInvoiceRecord>;
    findMany(args: InvoiceFindManyArgs): Promise<SerializedInvoiceRecord[]>;
  };
  userEntitlement: {
    findFirst(args: UserEntitlementFindFirstArgs): Promise<SerializedEntitlementRecord | null>;
    create(args: UserEntitlementCreateArgs): Promise<SerializedEntitlementRecord>;
    update(args: UserEntitlementUpdateArgs): Promise<SerializedEntitlementRecord>;
    findMany(args: UserEntitlementFindManyArgs): Promise<SerializedEntitlementRecord[]>;
  };
  $transaction<T>(callback: (client: TestPrismaClient) => Promise<T>): Promise<T>;
};

let testStore: TestStore;

function createTestStore() {
  let idCounter = 1;
  const users = new Map<string, UserRecord>();
  const plans = new Map<string, PlanRecord>();
  const subscriptions = new Map<string, SubscriptionRecord>();
  const subscriptionByUser = new Map<string, string>();
  const payments = new Map<string, PaymentRecord>();
  const invoices = new Map<string, InvoiceRecord>();
  const entitlements = new Map<string, EntitlementRecord>();

  const nextId = (prefix: string) => {
    const suffix = String(idCounter++).padStart(10, "0");
    return `c${prefix}_${suffix}`;
  };

  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

  const getSubscription = (where: { id?: string; userId?: string }) => {
    if (where.id) {
      return subscriptions.get(where.id) ?? null;
    }
    if (where.userId) {
      const id = subscriptionByUser.get(where.userId);
      return id ? subscriptions.get(id) ?? null : null;
    }
    return null;
  };

  const serializeSubscription = (record: SubscriptionRecord): SerializedSubscriptionRecord => ({
    id: record.id,
    userId: record.userId,
    planId: record.planId,
    status: record.status,
    endsAt: record.endsAt.toISOString(),
    cancelAtPeriodEnd: record.cancelAtPeriodEnd,
    updatedAt: record.updatedAt.toISOString(),
  });

  const serializePayment = (record: PaymentRecord): SerializedPaymentRecord => ({
    id: record.id,
    userId: record.userId,
    provider: record.provider,
    providerRef: record.providerRef,
    amount: record.amount,
    currency: record.currency,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
  });

  const serializeInvoice = (record: InvoiceRecord): SerializedInvoiceRecord => ({
    id: record.id,
    paymentId: record.paymentId,
    userId: record.userId,
    number: record.number,
    type: record.type,
    total: record.total,
    currency: record.currency,
    status: record.status,
    issuedAt: record.issuedAt.toISOString(),
    providerRef: record.providerRef,
  });

  const serializeEntitlement = (record: EntitlementRecord): SerializedEntitlementRecord => ({
    id: record.id,
    userId: record.userId,
    key: record.key,
    expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });

  const prisma: TestPrismaClient = {
    subscription: {
      findUnique: async ({ where, include }: SubscriptionFindUniqueArgs) => {
        const record = getSubscription(where);
        if (!record) {
          return null;
        }
        const payload: SerializedSubscriptionRecord = {
          ...serializeSubscription(record),
        };
        if (include?.plan) {
          const plan = plans.get(record.planId);
          payload.plan = plan ? clone(plan) : null;
        }
        if (include?.user) {
          const user = users.get(record.userId);
          payload.user = user ? clone(user) : null;
        }
        return payload;
      },
    },
    payment: {
      findUnique: async ({ where, include }: PaymentFindUniqueArgs) => {
        const record = payments.get(where.id);
        if (!record) {
          return null;
        }
        const payload: SerializedPaymentRecord = {
          ...serializePayment(record),
        };
        if (include?.invoice) {
          const invoice = Array.from(invoices.values()).find((item) => item.paymentId === record.id) ?? null;
          if (invoice) {
            payload.invoice = {
              id: invoice.id,
              number: invoice.number,
              type: invoice.type,
            };
          } else {
            payload.invoice = null;
          }
        }
        return payload;
      },
      update: async ({ where, data }: PaymentUpdateArgs) => {
        const record = payments.get(where.id);
        if (!record) {
          throw new Error("PAYMENT_NOT_FOUND");
        }
        const updated = { ...record, ...data } satisfies PaymentRecord;
        payments.set(record.id, updated);
        return { ...updated };
      },
    },
    invoice: {
      findUnique: async ({ where }: InvoiceFindUniqueArgs) => {
        if (where.paymentId) {
          const invoice = Array.from(invoices.values()).find((item) => item.paymentId === where.paymentId);
          return invoice ? serializeInvoice(invoice) : null;
        }
        if (!where.id) {
          return null;
        }
        const invoice = invoices.get(where.id);
        return invoice ? serializeInvoice(invoice) : null;
      },
      create: async ({ data }: InvoiceCreateArgs) => {
        const id = nextId("inv");
        const record: InvoiceRecord = {
          id,
          paymentId: data.paymentId,
          userId: data.userId,
          number: data.number ?? `INV-${idCounter}`,
          type: data.type,
          total: data.total,
          currency: data.currency,
          status: data.status,
          issuedAt: data.issuedAt ? new Date(data.issuedAt) : new Date(),
          providerRef: data.providerRef ?? null,
        };
        invoices.set(id, record);
        return serializeInvoice(record);
      },
      update: async ({ where, data }: InvoiceUpdateArgs) => {
        const record = invoices.get(where.id);
        if (!record) {
          throw new Error("INVOICE_NOT_FOUND");
        }
        const updated = {
          ...record,
          ...data,
          issuedAt: data.issuedAt ? new Date(data.issuedAt) : record.issuedAt,
        } satisfies InvoiceRecord;
        invoices.set(record.id, updated);
        return serializeInvoice(updated);
      },
      findMany: async ({ where, orderBy, include }: InvoiceFindManyArgs) => {
        let results = Array.from(invoices.values());
        if (where?.type) {
          results = results.filter((record) => record.type === where.type);
        }
        if (where?.status) {
          results = results.filter((record) => record.status === where.status);
        }
        if (where?.OR) {
          const clauses = where.OR;
          results = results.filter((record) =>
            clauses.some((clause) => {
              if (clause.number) {
                return record.number.toLowerCase().includes(clause.number.contains.toLowerCase());
              }
              if (clause.providerRef) {
                return (record.providerRef ?? "").toLowerCase().includes(clause.providerRef.contains.toLowerCase());
              }
              if (clause.user?.email) {
                const user = users.get(record.userId);
                return (user?.email ?? "").toLowerCase().includes(clause.user.email.contains.toLowerCase());
              }
              return false;
            }),
          );
        }
        if (where?.issuedAt) {
          results = results.filter((record) => {
            const issued = record.issuedAt.getTime();
            if (where.issuedAt?.gte && issued < new Date(where.issuedAt.gte).getTime()) {
              return false;
            }
            if (where.issuedAt?.lte && issued > new Date(where.issuedAt.lte).getTime()) {
              return false;
            }
            return true;
          });
        }
        if (orderBy?.issuedAt === "desc") {
          results.sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
        }
        return results.map((record) => {
          const user = users.get(record.userId);
          const payload: SerializedInvoiceRecord = serializeInvoice(record);
          if (include?.user) {
            payload.user = user ? clone(user) : null;
          }
          return payload;
        });
      },
    },
    userEntitlement: {
      findFirst: async ({ where, orderBy }: UserEntitlementFindFirstArgs) => {
        const items = Array.from(entitlements.values()).filter((item) => {
          if (where.userId && item.userId !== where.userId) {
            return false;
          }
          if (where.key && item.key !== where.key) {
            return false;
          }
          return true;
        });
        if (orderBy?.updatedAt === "desc") {
          items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        } else if (orderBy?.expiresAt === "desc") {
          items.sort((a, b) => (b.expiresAt?.getTime() ?? 0) - (a.expiresAt?.getTime() ?? 0));
        }
        const first = items[0];
        return first ? serializeEntitlement(first) : null;
      },
      create: async ({ data }: UserEntitlementCreateArgs) => {
        const id = nextId("ent");
        const now = new Date();
        const record: EntitlementRecord = {
          id,
          userId: data.userId,
          key: data.key,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          createdAt: now,
          updatedAt: now,
        };
        entitlements.set(id, record);
        return serializeEntitlement(record);
      },
      update: async ({ where, data }: UserEntitlementUpdateArgs) => {
        const record = entitlements.get(where.id);
        if (!record) {
          throw new Error("ENTITLEMENT_NOT_FOUND");
        }
        const updated: EntitlementRecord = {
          ...record,
          ...data,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : record.expiresAt,
          updatedAt: new Date(),
        };
        entitlements.set(record.id, updated);
        return serializeEntitlement(updated);
      },
      findMany: async ({ where }: UserEntitlementFindManyArgs) => {
        const items = Array.from(entitlements.values()).filter((item) => {
          if (where.userId && item.userId !== where.userId) {
            return false;
          }
          if (where.key && item.key !== where.key) {
            return false;
          }
          return true;
        });
        return items.map((item) => serializeEntitlement(item));
      },
    },
    $transaction: async <T>(callback: (client: TestPrismaClient) => Promise<T>) => callback(prisma),
  };

  const createUser = (user: UserRecord) => {
    users.set(user.id, user);
  };

  const createPlan = (plan: PlanRecord) => {
    plans.set(plan.id, plan);
  };

  const createSubscription = (record: Omit<SubscriptionRecord, "id" | "updatedAt"> & { id?: string }) => {
    const id = record.id ?? nextId("sub");
    const subscription: SubscriptionRecord = {
      id,
      userId: record.userId,
      planId: record.planId,
      status: record.status,
      endsAt: record.endsAt,
      cancelAtPeriodEnd: record.cancelAtPeriodEnd,
      updatedAt: new Date(),
    };
    subscriptions.set(id, subscription);
    subscriptionByUser.set(record.userId, id);
    return subscription;
  };

  const createPayment = (record: Omit<PaymentRecord, "id"> & { id?: string }) => {
    const id = record.id ?? nextId("pay");
    const payment: PaymentRecord = {
      id,
      userId: record.userId,
      provider: record.provider,
      providerRef: record.providerRef,
      amount: record.amount,
      currency: record.currency,
      status: record.status,
      createdAt: record.createdAt,
    };
    payments.set(id, payment);
    return payment;
  };

  const createInvoice = (record: Omit<InvoiceRecord, "id"> & { id?: string }) => {
    const id = record.id ?? nextId("inv");
    const invoice: InvoiceRecord = {
      id,
      paymentId: record.paymentId,
      userId: record.userId,
      number: record.number ?? `INV-${idCounter}`,
      type: record.type,
      total: record.total,
      currency: record.currency,
      status: record.status,
      issuedAt: record.issuedAt,
      providerRef: record.providerRef,
    };
    invoices.set(id, invoice);
    return invoice;
  };

  const createEntitlement = (record: Omit<EntitlementRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }) => {
    const id = record.id ?? nextId("ent");
    const now = new Date();
    const entitlement: EntitlementRecord = {
      id,
      userId: record.userId,
      key: record.key,
      expiresAt: record.expiresAt,
      createdAt: now,
      updatedAt: now,
    };
    entitlements.set(id, entitlement);
    return entitlement;
  };

  const markExpired = (userId: string) => {
    const subscriptionId = subscriptionByUser.get(userId);
    if (!subscriptionId) {
      throw new Error("SUBSCRIPTION_NOT_FOUND");
    }
    const subscription = subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error("SUBSCRIPTION_NOT_FOUND");
    }
    const updated: SubscriptionRecord = {
      ...subscription,
      status: "expired",
      updatedAt: new Date(),
    };
    subscriptions.set(subscriptionId, updated);
    for (const [id, entitlement] of entitlements.entries()) {
      if (entitlement.userId === userId) {
        entitlements.delete(id);
      }
    }
    return updated;
  };

  const getSubscriptionSnapshot = (userId: string) => {
    const id = subscriptionByUser.get(userId);
    return id ? subscriptions.get(id) ?? null : null;
  };

  const getEntitlements = (userId: string) => {
    return Array.from(entitlements.values()).filter((item) => item.userId === userId);
  };

  const getActiveEntitlements = (userId: string) => {
    const now = Date.now();
    return getEntitlements(userId).filter((item) => !item.expiresAt || item.expiresAt.getTime() > now);
  };

  const clearEntitlements = (userId: string) => {
    for (const [id, record] of entitlements.entries()) {
      if (record.userId === userId) {
        entitlements.delete(id);
      }
    }
  };

  const seed = () => {
    const user: UserRecord = { id: nextId("usr"), email: "user@example.com", name: "Test" };
    const plan: PlanRecord = { id: nextId("plan"), name: "Basic" };
    createUser(user);
    createPlan(plan);
    const subscription = createSubscription({
      userId: user.id,
      planId: plan.id,
      status: "active",
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
    });
    createEntitlement({ userId: user.id, key: CAN_PUBLISH_PROFILE, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    const payment = createPayment({
      userId: user.id,
      provider: "zarinpal",
      providerRef: "PAY-1",
      amount: 5000,
      currency: "IRR",
      status: "PAID",
      createdAt: new Date(),
    });
    createInvoice({
      paymentId: payment.id,
      userId: user.id,
      number: "INV-1000",
      type: "SALE",
      total: 5000,
      currency: "IRR",
      status: "PAID",
      issuedAt: new Date(),
      providerRef: payment.providerRef,
    });
    return { user, plan, subscription, payment };
  };

  return {
    prisma,
    createUser,
    createPlan,
    createSubscription,
    createPayment,
    createInvoice,
    createEntitlement,
    markExpired,
    getSubscriptionSnapshot,
    getEntitlements,
    getActiveEntitlements,
    seed,
    clearEntitlements,
  };
}

const getSessionMock = vi.fn(async () => ADMIN_SESSION);
const markExpiredMock = vi.fn(async ({ userId }: { userId: string }) => testStore.markExpired(userId));
const syncSingleUserMock = vi.fn(async () => {});

beforeEach(() => {
  vi.resetModules();
  testStore = createTestStore();
  getSessionMock.mockClear();
  markExpiredMock.mockClear();
  syncSingleUserMock.mockClear();
  vi.doMock("@/lib/prisma", () => ({
    prisma: testStore.prisma,
  }));
  vi.doMock("@/lib/auth/session", () => ({
    getServerAuthSession: getSessionMock,
  }));
  vi.doMock("@/lib/billing/subscriptionService", () => ({
    markExpired: markExpiredMock,
  }));
  vi.doMock("@/lib/billing/entitlementSync", () => ({
    syncSingleUser: syncSingleUserMock,
  }));
});

describe("admin billing routes", () => {
  it("force cancels subscription and removes entitlement", async () => {
    const fixtures = testStore.seed();
    const { POST } = await import("@/app/api/admin/subscriptions/[id]/cancel/route");

    const response = await POST(new NextRequest("http://localhost/api"), { params: { id: fixtures.subscription.id } });
    const body = await response.json();

    expect(body.subscription.status).toBe("expired");
    const snapshot = testStore.getSubscriptionSnapshot(fixtures.user.id);
    expect(snapshot?.status).toBe("expired");
    expect(testStore.getEntitlements(fixtures.user.id)).toHaveLength(0);
  });

  it("marks payment refunded and creates refund invoice", async () => {
    const fixtures = testStore.seed();
    const { POST } = await import("@/app/api/admin/payments/[id]/refund/route");

    const request = new NextRequest("http://localhost/api", {
      method: "POST",
      body: JSON.stringify({ amount: fixtures.payment.amount }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request, { params: { id: fixtures.payment.id } });
    const payload = await response.json();

    expect(payload.paymentId).toBe(fixtures.payment.id);
    const updatedPayment = await testStore.prisma.payment.findUnique({ where: { id: fixtures.payment.id } });
    expect(updatedPayment?.status).toBe("REFUNDED");
    const invoice = await testStore.prisma.invoice.findUnique({ where: { paymentId: fixtures.payment.id } });
    expect(invoice?.type).toBe("REFUND");
    expect(invoice?.total).toBe(-fixtures.payment.amount);
    expect(testStore.getEntitlements(fixtures.user.id)).toHaveLength(0);
  });

  it("grants and revokes entitlement", async () => {
    const fixtures = testStore.seed();
    testStore.clearEntitlements(fixtures.user.id);
    const { POST } = await import("@/app/api/admin/entitlements/adjust/route");

    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const grantRequest = new NextRequest("http://localhost/api", {
      method: "POST",
      body: JSON.stringify({
        userId: fixtures.user.id,
        action: "grant",
        key: CAN_PUBLISH_PROFILE,
        reason: "manual",
        expiresAt: future,
      }),
      headers: { "Content-Type": "application/json" },
    });
    await POST(grantRequest);

    expect(testStore.getActiveEntitlements(fixtures.user.id)).toHaveLength(1);

    const revokeRequest = new NextRequest("http://localhost/api", {
      method: "POST",
      body: JSON.stringify({
        userId: fixtures.user.id,
        action: "revoke",
        key: CAN_PUBLISH_PROFILE,
        reason: "manual",
      }),
      headers: { "Content-Type": "application/json" },
    });
    await POST(revokeRequest);

    expect(testStore.getActiveEntitlements(fixtures.user.id)).toHaveLength(0);
  });

  it("exports invoices as CSV", async () => {
    const fixtures = testStore.seed();
    void fixtures;
    const { GET } = await import("@/app/api/admin/invoices/export/route");

    const response = await GET(new NextRequest("http://localhost/api"));
    expect(response.headers.get("content-type")).toContain("text/csv");
    const text = await response.text();
    expect(text).toContain("number,userEmail,type,total,currency,issuedAt,status,providerRef");
    expect(text.split("\n")).toHaveLength(2);
  });
});

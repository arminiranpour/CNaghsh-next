/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  PaymentStatus,
  PlanCycle,
  ProductType,
  SubscriptionStatus,
  type Prisma,
} from "@prisma/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

function createTestPrisma() {
  let idCounter = 1;
  const nextId = (prefix: string) => `${prefix}_${idCounter++}`;

  type ProductRecord = {
    id: string;
    type: ProductType;
    name: string;
  };

  type PlanRecord = {
    id: string;
    productId: string;
    name: string;
    cycle: PlanCycle;
    limits: Prisma.JsonValue;
  };

  type PlanPayload = PlanRecord & { product?: ProductRecord };

  type PriceRecord = {
    id: string;
    planId: string | null;
    productId: string | null;
    amount: number;
    currency: string;
  };

  type SessionRecord = {
    id: string;
    userId: string;
    provider: string;
    priceId: string;
  };

  type PaymentRecord = {
    id: string;
    userId: string;
    status: PaymentStatus;
    providerRef: string;
    checkoutSessionId: string;
  };

  type SubscriptionRecord = {
    id: string;
    userId: string;
    planId: string;
    status: SubscriptionStatus;
    startedAt: Date;
    endsAt: Date;
    renewalAt: Date | null;
    cancelAtPeriodEnd: boolean;
    providerRef?: string | null;
  };

  type UserEntitlementRecord = {
    id: string;
    userId: string;
    key: string;
    expiresAt: Date;
    remainingCredits: number | null;
  };

  const products = new Map<string, ProductRecord>();
  const plans = new Map<string, PlanRecord>();
  const prices = new Map<string, PriceRecord>();
  const sessions = new Map<string, SessionRecord>();
  const payments = new Map<string, PaymentRecord>();
  const subscriptions = new Map<string, SubscriptionRecord>();
  const subscriptionsByUser = new Map<string, string>();
  const userEntitlements = new Map<string, UserEntitlementRecord>();
  const auditLogs: Array<Record<string, any>> = [];

  const clone = <T extends Record<string, any>>(record: T) => ({
    ...record,
  });

  const resolvePlan = (planId: string): PlanPayload | null => {
    const plan = plans.get(planId);
    if (!plan) {
      return null;
    }
    return clone(plan) as PlanPayload;
  };

  const prismaMock = {
    plan: {
      findUnique: async ({ where, select }: any) => {
        const plan = plans.get(where.id);
        if (!plan) {
          return null;
        }
        if (select) {
          const picked: Record<string, unknown> = {};
          for (const key of Object.keys(select)) {
            if (select[key]) {
              picked[key] = (plan as any)[key];
            }
          }
          return picked;
        }
        return clone(plan);
      },
    },
    product: {
      findUnique: async ({ where, select }: any) => {
        const product = products.get(where.id);
        if (!product) {
          return null;
        }
        if (select) {
          const picked: Record<string, unknown> = {};
          for (const key of Object.keys(select)) {
            if (select[key]) {
              picked[key] = (product as any)[key];
            }
          }
          return picked;
        }
        return clone(product);
      },
    },
    subscription: {
      findUnique: async ({ where, include }: any) => {
        const byUser = where.userId ? subscriptionsByUser.get(where.userId) : null;
        const id = byUser ?? where.id;
        const record = id ? subscriptions.get(id) : null;
        if (!record) {
          return null;
        }
        const payload: any = clone(record);
        if (include?.plan) {
          payload.plan = resolvePlan(record.planId);
        }
        return payload;
      },
      create: async ({ data, include }: any) => {
        if (subscriptionsByUser.has(data.userId)) {
          throw new Error("UNIQUE_CONSTRAINT");
        }
        const created: SubscriptionRecord = {
          id: nextId("sub"),
          userId: data.userId,
          planId: data.planId,
          status: data.status,
          startedAt: data.startedAt,
          endsAt: data.endsAt,
          renewalAt: data.renewalAt ?? null,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
          providerRef: data.providerRef ?? null,
        };
        subscriptions.set(created.id, created);
        subscriptionsByUser.set(created.userId, created.id);
        const payload: any = clone(created);
        if (include?.plan) {
          payload.plan = resolvePlan(created.planId);
        }
        return payload;
      },
      update: async ({ where, data, include }: any) => {
        const id = where.id ?? subscriptionsByUser.get(where.userId);
        if (!id) {
          throw new Error("SUBSCRIPTION_NOT_FOUND");
        }
        const existing = subscriptions.get(id);
        if (!existing) {
          throw new Error("SUBSCRIPTION_NOT_FOUND");
        }
        const updated: SubscriptionRecord = {
          ...existing,
          ...data,
        };
        subscriptions.set(id, updated);
        const payload: any = clone(updated);
        if (include?.plan) {
          payload.plan = resolvePlan(updated.planId);
        }
        return payload;
      },
    },
    payment: {
      findUnique: async ({ where, include }: any) => {
        const payment = payments.get(where.id);
        if (!payment) {
          return null;
        }
        const payload: any = clone(payment);
        if (include?.session) {
          const session = sessions.get(payment.checkoutSessionId);
          if (session) {
            const sessionPayload: any = clone(session);
            if (include.session.include?.price) {
              const price = prices.get(session.priceId);
              if (price) {
                const pricePayload: any = clone(price);
                if (include.session.include.price.include?.plan && price.planId) {
                  const planRecord = resolvePlan(price.planId);
                  if (planRecord) {
                    if (
                      include.session.include.price.include.plan?.include?.product &&
                      planRecord.productId
                    ) {
                      const productRecord = products.get(planRecord.productId);
                      if (productRecord) {
                        planRecord.product = clone(productRecord);
                      }
                    }
                    pricePayload.plan = planRecord;
                  }
                }
                if (include.session.include.price.include?.product && price.productId) {
                  const productRecord = products.get(price.productId);
                  if (productRecord) {
                    pricePayload.product = clone(productRecord);
                  }
                }
                sessionPayload.price = pricePayload;
              }
            }
            payload.session = sessionPayload;
          }
        }
        return payload;
      },
    },
    userEntitlement: {
      findFirst: async ({ where, orderBy }: any) => {
        const records = Array.from(userEntitlements.values()).filter((record) => {
          if (record.userId !== where.userId) {
            return false;
          }
          if (where.key && record.key !== where.key) {
            return false;
          }
          if (where.expiresAt?.gt && !(record.expiresAt > where.expiresAt.gt)) {
            return false;
          }
          return true;
        });

        if (orderBy?.expiresAt === "desc") {
          records.sort((a, b) => b.expiresAt.getTime() - a.expiresAt.getTime());
        }

        const found = records[0];
        return found ? clone(found) : null;
      },
      update: async ({ where, data }: any) => {
        const existing = userEntitlements.get(where.id);
        if (!existing) {
          throw new Error("ENTITLEMENT_NOT_FOUND");
        }
        const updated: UserEntitlementRecord = {
          ...existing,
          ...data,
        };
        userEntitlements.set(existing.id, updated);
        return clone(updated);
      },
      create: async ({ data }: any) => {
        const created: UserEntitlementRecord = {
          id: nextId("ent"),
          userId: data.userId,
          key: data.key,
          expiresAt: data.expiresAt,
          remainingCredits: data.remainingCredits ?? null,
        };
        userEntitlements.set(created.id, created);
        return clone(created);
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        const created = { id: nextId("audit"), ...clone(data) };
        auditLogs.push(created);
        return created;
      },
    },
    $transaction: async (callback: (tx: any) => Promise<any>) =>
      callback({
        ...prismaMock,
        userEntitlement: prismaMock.userEntitlement,
      }),
  } as const;

  return {
    prisma: prismaMock,
    reset: () => {
      products.clear();
      plans.clear();
      prices.clear();
      sessions.clear();
      payments.clear();
      subscriptions.clear();
      subscriptionsByUser.clear();
      userEntitlements.clear();
      auditLogs.length = 0;
      idCounter = 1;
    },
    helpers: {
      createProduct: ({
        id = nextId("prod"),
        type = ProductType.SUBSCRIPTION,
        name = "Test Product",
      }: { id?: string; type?: ProductType; name?: string } = {}) => {
        const product: ProductRecord = { id, type, name };
        products.set(id, product);
        return product;
      },
      createPlan: ({
        id = nextId("plan"),
        productId,
        cycle = PlanCycle.MONTHLY,
        name = "Test Plan",
      }: {
        id?: string;
        productId: string;
        cycle?: PlanCycle;
        name?: string;
      }) => {
        const plan: PlanRecord = {
          id,
          productId,
          name,
          cycle,
          limits: {},
        };
        plans.set(id, plan);
        return plan;
      },
      createPrice: ({
        id = nextId("price"),
        planId = null,
        productId = null,
        amount = 1000,
        currency = "IRR",
      }: {
        id?: string;
        planId?: string | null;
        productId?: string | null;
        amount?: number;
        currency?: string;
      }) => {
        const price: PriceRecord = { id, planId, productId, amount, currency };
        prices.set(id, price);
        return price;
      },
      createSession: ({
        id = nextId("sess"),
        userId,
        provider = "test",
        priceId,
      }: {
        id?: string;
        userId: string;
        provider?: string;
        priceId: string;
      }) => {
        const session: SessionRecord = { id, userId, provider, priceId };
        sessions.set(id, session);
        return session;
      },
      createPayment: ({
        id = nextId("pay"),
        userId,
        status = PaymentStatus.PAID,
        providerRef = nextId("ref"),
        checkoutSessionId,
      }: {
        id?: string;
        userId: string;
        status?: PaymentStatus;
        providerRef?: string;
        checkoutSessionId: string;
      }) => {
        const payment: PaymentRecord = {
          id,
          userId,
          status,
          providerRef,
          checkoutSessionId,
        };
        payments.set(id, payment);
        return payment;
      },
    },
  } as const;
}

const testDb = vi.hoisted(createTestPrisma);

vi.mock("@/lib/prisma", () => ({ prisma: testDb.prisma }));

const lifecycle = await import("../subscriptionService");
const { applyPaymentToSubscription } = await import("../paymentToSubscription");
const events = await import("../events");

const {
  activateOrStart,
  renew,
  markExpired,
  setCancelAtPeriodEnd,
  getSubscription,
  computePeriodEnds,
  SubscriptionNotFoundError,
} = lifecycle;

const { on } = events;

describe("subscription lifecycle", () => {
  const userId = "user_1";
  let product: { id: string };
  let plan: { id: string; cycle: PlanCycle };
  let offHandlers: Array<() => void> = [];
  let capturedEvents: string[] = [];

  beforeEach(() => {
    testDb.reset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
    product = testDb.helpers.createProduct();
    plan = testDb.helpers.createPlan({ productId: product.id, cycle: PlanCycle.MONTHLY });
    capturedEvents = [];
    offHandlers = [
      on("SUBSCRIPTION_ACTIVATED", (event) => {
        capturedEvents.push(event.type);
      }),
      on("SUBSCRIPTION_RESTARTED", (event) => {
        capturedEvents.push(event.type);
      }),
      on("SUBSCRIPTION_RENEWED", (event) => {
        capturedEvents.push(event.type);
      }),
      on("SUBSCRIPTION_EXPIRED", (event) => {
        capturedEvents.push(event.type);
      }),
      on("SUBSCRIPTION_CANCEL_AT_PERIOD_END_SET", (event) => {
        capturedEvents.push(event.type);
      }),
      on("SUBSCRIPTION_CANCEL_AT_PERIOD_END_CLEARED", (event) => {
        capturedEvents.push(event.type);
      }),
    ];
  });

  afterEach(() => {
    offHandlers.forEach((off) => off());
    offHandlers = [];
    capturedEvents = [];
    vi.useRealTimers();
  });

  it("activates a subscription when none exists", async () => {
    const subscription = await activateOrStart({
      userId,
      planId: plan.id,
      providerRef: "ref-1",
    });

    expect(subscription.status).toBe(SubscriptionStatus.active);
    expect(subscription.planId).toBe(plan.id);
    const expectedEnd = computePeriodEnds(subscription.startedAt, plan.cycle);
    expect(subscription.endsAt.getTime()).toBe(expectedEnd.getTime());
    expect(subscription.renewalAt?.getTime()).toBe(subscription.endsAt.getTime());
    expect(capturedEvents).toContain("SUBSCRIPTION_ACTIVATED");
  });

  it("renews from the existing end date before expiry", async () => {
    const initial = await activateOrStart({ userId, planId: plan.id });
    const initialEnds = initial.endsAt;

    const beforeExpiry = new Date(initialEnds.getTime() - 36 * 60 * 60 * 1000);
    vi.setSystemTime(beforeExpiry);

    const renewed = await renew({ userId, providerRef: "ref-renew" });

    expect(renewed.startedAt.getTime()).toBe(initialEnds.getTime());
    const expectedEnd = computePeriodEnds(initialEnds, plan.cycle);
    expect(renewed.endsAt.getTime()).toBe(expectedEnd.getTime());
    expect(capturedEvents).toContain("SUBSCRIPTION_RENEWED");
  });

  it("renews from now when the subscription already expired", async () => {
    const initial = await activateOrStart({ userId, planId: plan.id });
    const pastExpiry = new Date(initial.endsAt.getTime() + 48 * 60 * 60 * 1000);
    vi.setSystemTime(pastExpiry);

    const renewed = await renew({ userId });

    expect(renewed.startedAt.getTime()).toBe(pastExpiry.getTime());
    const expectedEnd = computePeriodEnds(pastExpiry, plan.cycle);
    expect(renewed.endsAt.getTime()).toBe(expectedEnd.getTime());
  });

  it("toggles cancel at period end state", async () => {
    await activateOrStart({ userId, planId: plan.id });

    const canceled = await setCancelAtPeriodEnd({ userId, flag: true });
    expect(canceled.cancelAtPeriodEnd).toBe(true);
    expect(canceled.status).toBe(SubscriptionStatus.renewing);
    expect(capturedEvents).toContain("SUBSCRIPTION_CANCEL_AT_PERIOD_END_SET");

    const cleared = await setCancelAtPeriodEnd({ userId, flag: false });
    expect(cleared.cancelAtPeriodEnd).toBe(false);
    expect(cleared.status).toBe(SubscriptionStatus.active);
    expect(capturedEvents).toContain("SUBSCRIPTION_CANCEL_AT_PERIOD_END_CLEARED");
  });

  it("marks subscriptions as expired and allows renewal", async () => {
    await activateOrStart({ userId, planId: plan.id });
    const expired = await markExpired({ userId });
    expect(expired.status).toBe(SubscriptionStatus.expired);
    expect(capturedEvents).toContain("SUBSCRIPTION_EXPIRED");

    const resumeTime = new Date("2025-04-01T00:00:00.000Z");
    vi.setSystemTime(resumeTime);
    const renewed = await renew({ userId });
    expect(renewed.status).toBe(SubscriptionStatus.active);
    expect(renewed.startedAt.getTime()).toBe(resumeTime.getTime());
  });

  it("applies paid payments to subscriptions", async () => {
    const price = testDb.helpers.createPrice({ planId: plan.id });
    const session = testDb.helpers.createSession({
      userId,
      priceId: price.id,
    });
    const payment = testDb.helpers.createPayment({
      userId,
      checkoutSessionId: session.id,
      providerRef: "pay-ref-1",
    });

    await applyPaymentToSubscription({ paymentId: payment.id });

    const subscription = await getSubscription(userId);
    expect(subscription).not.toBeNull();
    expect(subscription?.planId).toBe(plan.id);

    const firstEnds = subscription?.endsAt as Date;
    const beforeExpiry = new Date(firstEnds.getTime() - 24 * 60 * 60 * 1000);
    vi.setSystemTime(beforeExpiry);

    const secondPayment = testDb.helpers.createPayment({
      userId,
      checkoutSessionId: session.id,
      providerRef: "pay-ref-2",
    });

    await applyPaymentToSubscription({ paymentId: secondPayment.id });
    const renewed = await getSubscription(userId);
    expect(renewed?.endsAt.getTime()).toBe(
      computePeriodEnds(firstEnds, plan.cycle).getTime(),
    );
  });

  it("ignores payments for non-subscription products", async () => {
    const product = testDb.helpers.createProduct({ type: ProductType.JOB_POST });
    const price = testDb.helpers.createPrice({ productId: product.id, planId: null });
    const session = testDb.helpers.createSession({ userId, priceId: price.id });
    const payment = testDb.helpers.createPayment({
      userId,
      checkoutSessionId: session.id,
      providerRef: "job-pay", 
    });

    await applyPaymentToSubscription({ paymentId: payment.id });
    const subscription = await getSubscription(userId);
    expect(subscription).toBeNull();
  });

  it("throws when canceling without a subscription", async () => {
    await expect(() =>
      setCancelAtPeriodEnd({ userId: "missing", flag: true }),
    ).rejects.toBeInstanceOf(SubscriptionNotFoundError);
  });
});

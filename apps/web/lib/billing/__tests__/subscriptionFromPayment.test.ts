import {
  PaymentStatus,
  PlanCycle,
  ProductType,
  SubscriptionStatus,
} from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/entitlements/revalidate", () => ({
  revalidateSubscriptionViews: revalidateMock,
}));

type PaymentRecord = {
  id: string;
  userId: string;
  status: PaymentStatus;
  checkoutSessionId: string;
  providerRef: string | null;
};

type SessionRecord = {
  id: string;
  userId: string;
  priceId: string | null;
};

type PriceRecord = {
  id: string;
  planId: string | null;
  productId: string | null;
};

type PlanRecord = {
  id: string;
  productId: string;
  cycle: PlanCycle;
};

type ProductRecord = {
  id: string;
  type: ProductType;
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
  providerRef: string | null;
};

type SubscriptionCreateInput = {
  id?: string;
  userId: string;
  planId: string;
  status?: SubscriptionStatus;
  startedAt: Date | string;
  endsAt: Date | string;
  renewalAt?: Date | string | null;
  cancelAtPeriodEnd?: boolean;
  providerRef?: string | null;
};

type EntitlementRecord = {
  id: string;
  userId: string;
  key: string;
  expiresAt: Date | null;
  remainingCredits: number | null;
};

type AuditLogRecord = {
  id: string;
  action: string;
  reason: string;
};

type PlanInclude =
  | true
  | {
      include?: {
        product?: boolean;
      };
    };

type PlanIncludeNormalized = {
  include?: {
    product?: boolean;
  };
};

type PlanWithProduct = PlanRecord & { product?: ProductRecord | null };

type SubscriptionInclude = {
  plan?: PlanInclude;
};

type SubscriptionIncludeNormalized = {
  plan?: PlanIncludeNormalized;
};

type PriceInclude =
  | true
  | {
      include?: {
        plan?: PlanInclude;
        product?: boolean;
      };
    };

type PriceIncludeNormalized = {
  include?: {
    plan?: PlanIncludeNormalized;
    product?: boolean;
  };
};

type SessionInclude =
  | true
  | {
      include?: {
        price?: PriceInclude;
      };
    };

type SessionIncludeNormalized = {
  include?: {
    price?: PriceIncludeNormalized;
  };
};

type PaymentInclude = {
  session?: SessionInclude;
};

type PriceWithRelations = PriceRecord & {
  plan?: PlanWithProduct | null;
  product?: ProductRecord | null;
};

type SessionWithRelations = SessionRecord & {
  price?: PriceWithRelations | null;
};

type PaymentWithRelations = PaymentRecord & {
  session?: SessionWithRelations | null;
};

type PlanSelect = Partial<Record<keyof PlanRecord, boolean>>;
type ProductSelect = Partial<Record<keyof ProductRecord, boolean>>;

type EntitlementWhere = {
  userId: string;
  key: string;
  expiresAt?: { gt: Date } | null;
};

type EntitlementOrderBy = {
  expiresAt?: "asc" | "desc";
};

type AuditLogCreateData = {
  action: string;
  reason: string;
  [key: string]: unknown;
};

function createTestPrisma() {
  let idCounter = 1;
  const nextId = (prefix: string) => `${prefix}_${idCounter++}`;

  const payments = new Map<string, PaymentRecord>();
  const sessions = new Map<string, SessionRecord>();
  const prices = new Map<string, PriceRecord>();
  const plans = new Map<string, PlanRecord>();
  const products = new Map<string, ProductRecord>();
  const subscriptions = new Map<string, SubscriptionRecord>();
  const subscriptionsByUser = new Map<string, string>();
  const entitlements = new Map<string, EntitlementRecord>();
  const auditLogs: AuditLogRecord[] = [];

  const clone = <T extends Record<string, unknown>>(record: T) => ({
    ...record,
  });

  const normalizePlanInclude = (include?: PlanInclude): PlanIncludeNormalized | undefined => {
    if (!include) {
      return undefined;
    }
    if (include === true) {
      return { include: {} };
    }
    return include;
  };

  const normalizeSubscriptionInclude = (
    include?: SubscriptionInclude,
  ): SubscriptionIncludeNormalized | undefined => {
    if (!include) {
      return undefined;
    }
    return {
      plan: normalizePlanInclude(include.plan),
    };
  };

  const normalizePriceInclude = (include?: PriceInclude): PriceIncludeNormalized | undefined => {
    if (!include) {
      return undefined;
    }
    if (include === true) {
      return { include: {} };
    }
    return {
      include: {
        plan: normalizePlanInclude(include.include?.plan),
        product: include.include?.product ?? false,
      },
    };
  };

  const normalizeSessionInclude = (
    include?: SessionInclude,
  ): SessionIncludeNormalized | undefined => {
    if (!include) {
      return undefined;
    }
    if (include === true) {
      return { include: {} };
    }
    return {
      include: {
        price: normalizePriceInclude(include.include?.price),
      },
    };
  };

  const attachPlan = (planId: string | null, include?: PlanIncludeNormalized): PlanWithProduct | null => {
    if (!planId) {
      return null;
    }
    const plan = plans.get(planId);
    if (!plan) {
      return null;
    }

    const result: PlanWithProduct = clone(plan);
    if (include?.include?.product) {
      const product = products.get(plan.productId) ?? null;
      result.product = product ? clone(product) : null;
    }

    return result;
  };

  const attachSubscription = (
    record: SubscriptionRecord,
    include?: SubscriptionIncludeNormalized,
  ): SubscriptionRecord & { plan?: PlanWithProduct | null } => {
    const base: SubscriptionRecord & { plan?: PlanWithProduct | null } = clone(record);
    if (include?.plan) {
      base.plan = attachPlan(record.planId, include.plan);
    }
    return base;
  };

  const prismaMock = {
    payment: {
      findUnique: async ({ where, include }: { where: { id: string }; include?: PaymentInclude }) => {
        const record = payments.get(where.id);
        if (!record) {
          return null;
        }

        const base: PaymentWithRelations = clone(record);
        const sessionInclude = normalizeSessionInclude(include?.session);
        if (sessionInclude) {
          const session = record.checkoutSessionId
            ? sessions.get(record.checkoutSessionId) ?? null
            : null;
          if (!session) {
            base.session = null;
          } else {
            const sessionResult: SessionWithRelations = clone(session);
            const priceInclude = sessionInclude.include?.price;
            if (priceInclude) {
              const price = session.priceId ? prices.get(session.priceId) ?? null : null;
              if (!price) {
                sessionResult.price = null;
              } else {
                const priceResult: PriceWithRelations = clone(price);
                const planInclude = priceInclude.include?.plan;
                if (planInclude) {
                  priceResult.plan = attachPlan(price.planId, planInclude);
                }
                if (priceInclude.include?.product) {
                  const product = price.productId
                    ? products.get(price.productId) ?? null
                    : null;
                  priceResult.product = product ? clone(product) : null;
                }
                sessionResult.price = priceResult;
              }
            }
            base.session = sessionResult;
          }
        }

        return base;
      },
    },
    plan: {
      findUnique: async ({ where, select }: { where: { id: string }; select?: PlanSelect }) => {
        const plan = plans.get(where.id);
        if (!plan) {
          return null;
        }
        if (!select) {
          return clone(plan);
        }
        const picked: Partial<PlanRecord> = {};
        for (const key of Object.keys(select) as (keyof PlanRecord)[]) {
          if (select[key]) {
            picked[key] = plan[key];
          }
        }
        return picked;
      },
    },
    product: {
      findUnique: async ({ where, select }: { where: { id: string }; select?: ProductSelect }) => {
        const product = products.get(where.id);
        if (!product) {
          return null;
        }
        if (!select) {
          return clone(product);
        }
        const picked: Partial<ProductRecord> = {};
        for (const key of Object.keys(select) as (keyof ProductRecord)[]) {
          if (select[key]) {
            picked[key] = product[key];
          }
        }
        return picked;
      },
    },
    subscription: {
      findUnique: async ({
        where,
        include,
      }: {
        where: { id?: string; userId?: string };
        include?: SubscriptionInclude;
      }) => {
        let record: SubscriptionRecord | undefined;
        if (where.id) {
          record = subscriptions.get(where.id);
        } else if (where.userId) {
          const subId = subscriptionsByUser.get(where.userId);
          record = subId ? subscriptions.get(subId) : undefined;
        }
        if (!record) {
          return null;
        }
        return attachSubscription(record, normalizeSubscriptionInclude(include));
      },
      create: async ({
        data,
        include,
      }: {
        data: SubscriptionCreateInput;
        include?: SubscriptionInclude;
      }) => {
        const created: SubscriptionRecord = {
          id: data.id ?? nextId("sub"),
          userId: data.userId,
          planId: data.planId,
          status: data.status ?? SubscriptionStatus.active,
          startedAt: new Date(data.startedAt),
          endsAt: new Date(data.endsAt),
          renewalAt:
            data.renewalAt === undefined
              ? null
              : data.renewalAt
                ? new Date(data.renewalAt)
                : null,
          cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
          providerRef: data.providerRef ?? null,
        };
        subscriptions.set(created.id, created);
        subscriptionsByUser.set(created.userId, created.id);
        return attachSubscription(created, normalizeSubscriptionInclude(include));
      },
      update: async ({
        where,
        data,
        include,
      }: {
        where: { id: string };
        data: Partial<SubscriptionRecord> & {
          startedAt?: string | Date;
          endsAt?: string | Date;
          renewalAt?: string | Date | null;
        };
        include?: SubscriptionInclude;
      }) => {
        const record = subscriptions.get(where.id);
        if (!record) {
          throw new Error("Subscription not found");
        }
        const updated: SubscriptionRecord = {
          ...record,
          ...data,
          startedAt: data.startedAt ? new Date(data.startedAt) : record.startedAt,
          endsAt: data.endsAt ? new Date(data.endsAt) : record.endsAt,
          renewalAt: data.renewalAt ? new Date(data.renewalAt) : record.renewalAt,
        };
        subscriptions.set(updated.id, updated);
        subscriptionsByUser.set(updated.userId, updated.id);
        return attachSubscription(updated, normalizeSubscriptionInclude(include));
      },
    },
    userEntitlement: {
      findFirst: async ({
        where,
        orderBy,
      }: {
        where: EntitlementWhere;
        orderBy?: EntitlementOrderBy;
      }) => {
        const filtered = Array.from(entitlements.values()).filter((item) => {
          if (item.userId !== where.userId) {
            return false;
          }
          if (item.key !== where.key) {
            return false;
          }
          if (where.expiresAt?.gt) {
            if (!item.expiresAt) {
              return false;
            }
            return item.expiresAt.getTime() > new Date(where.expiresAt.gt).getTime();
          }
          return true;
        });

        if (orderBy?.expiresAt === "desc") {
          filtered.sort((a, b) => {
            const aTime = a.expiresAt ? a.expiresAt.getTime() : 0;
            const bTime = b.expiresAt ? b.expiresAt.getTime() : 0;
            return bTime - aTime;
          });
        }

        const found = filtered[0];
        return found ? clone(found) : null;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: {
          expiresAt?: Date | string | null;
          remainingCredits?: number | null;
        };
      }) => {
        const record = entitlements.get(where.id);
        if (!record) {
          throw new Error("Entitlement not found");
        }
        const updated: EntitlementRecord = {
          ...record,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : record.expiresAt,
          remainingCredits:
            data.remainingCredits !== undefined
              ? data.remainingCredits
              : record.remainingCredits,
        };
        entitlements.set(updated.id, updated);
        return clone(updated);
      },
      create: async ({
        data,
      }: {
        data: {
          userId: string;
          key: string;
          expiresAt?: Date | string | null;
          remainingCredits?: number | null;
        };
      }) => {
        const created: EntitlementRecord = {
          id: nextId("ent"),
          userId: data.userId,
          key: data.key,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          remainingCredits:
            data.remainingCredits !== undefined ? data.remainingCredits : null,
        };
        entitlements.set(created.id, created);
        return clone(created);
      },
    },
    auditLog: {
      create: async ({ data }: { data: AuditLogCreateData }) => {
        const record: AuditLogRecord = {
          id: nextId("audit"),
          action: data.action,
          reason: data.reason,
        };
        auditLogs.push(record);
        return record;
      },
    },
    $transaction: async <T>(callback: (tx: typeof prismaMock) => Promise<T>) =>
      callback(prismaMock),
  } as const;

  const helpers = {
    reset: () => {
      payments.clear();
      sessions.clear();
      prices.clear();
      plans.clear();
      products.clear();
      subscriptions.clear();
      subscriptionsByUser.clear();
      entitlements.clear();
      auditLogs.length = 0;
      idCounter = 1;
    },
    createProduct: ({
      id = nextId("prod"),
      type = ProductType.SUBSCRIPTION,
    }: { id?: string; type?: ProductType } = {}) => {
      const record: ProductRecord = { id, type };
      products.set(id, record);
      return record;
    },
    createPlan: ({
      id = nextId("plan"),
      productId,
      cycle = PlanCycle.MONTHLY,
    }: {
      id?: string;
      productId: string;
      cycle?: PlanCycle;
    }) => {
      const record: PlanRecord = { id, productId, cycle };
      plans.set(id, record);
      return record;
    },
    createPrice: ({
      id = nextId("price"),
      planId = null,
      productId = null,
    }: {
      id?: string;
      planId?: string | null;
      productId?: string | null;
    }) => {
      const record: PriceRecord = { id, planId, productId };
      prices.set(id, record);
      return record;
    },
    createSession: ({
      id = nextId("sess"),
      userId,
      priceId = null,
    }: {
      id?: string;
      userId: string;
      priceId?: string | null;
    }) => {
      const record: SessionRecord = { id, userId, priceId };
      sessions.set(id, record);
      return record;
    },
    createPayment: ({
      id = nextId("pay"),
      userId,
      status = PaymentStatus.PAID,
      checkoutSessionId,
      providerRef = nextId("ref"),
    }: {
      id?: string;
      userId: string;
      status?: PaymentStatus;
      checkoutSessionId: string;
      providerRef?: string;
    }) => {
      const record: PaymentRecord = {
        id,
        userId,
        status,
        checkoutSessionId,
        providerRef,
      };
      payments.set(id, record);
      return record;
    },
    getEntitlements: () => Array.from(entitlements.values()).map(clone),
    getSubscription: (userId: string) => {
      const subId = subscriptionsByUser.get(userId);
      return subId ? clone(subscriptions.get(subId)!) : null;
    },
    getAuditLogs: () => [...auditLogs],
  };

  return { prisma: prismaMock, helpers } as const;
}

const testDb = vi.hoisted(createTestPrisma);

vi.mock("../../prisma", () => ({ prisma: testDb.prisma }));
vi.mock("@/lib/prisma", () => ({ prisma: testDb.prisma }));

const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

const { applyPaymentToSubscription } = await import("../paymentToSubscription");
const { computePeriodEnds } = await import("../subscriptionService");

describe("applyPaymentToSubscription - entitlements", () => {
  beforeEach(() => {
    testDb.helpers.reset();
    revalidateMock.mockReset();
    infoSpy.mockClear();
    errorSpy.mockClear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("grants subscription entitlement for paid subscription", async () => {
    const userId = "user-sub";
    const product = testDb.helpers.createProduct();
    const plan = testDb.helpers.createPlan({ productId: product.id });
    const price = testDb.helpers.createPrice({ planId: plan.id, productId: product.id });
    const session = testDb.helpers.createSession({ userId, priceId: price.id });
    const payment = testDb.helpers.createPayment({ userId, checkoutSessionId: session.id });

    const result = await applyPaymentToSubscription({ paymentId: payment.id });

    expect(result).toMatchObject({
      applied: true,
      action: "activated",
      entitlementAction: "created",
    });

    const entitlement = testDb.helpers.getEntitlements()[0];
    const subscription = testDb.helpers.getSubscription(userId);
    expect(entitlement).toBeDefined();
    expect(entitlement.key).toBe("CAN_PUBLISH_PROFILE");
    expect(entitlement.expiresAt?.getTime()).toBe(subscription?.endsAt.getTime());

    const expectedEnd = computePeriodEnds(subscription!.startedAt, plan.cycle);
    expect(subscription?.endsAt.getTime()).toBe(expectedEnd.getTime());

    expect(revalidateMock).toHaveBeenCalledWith(userId);
    expect(testDb.helpers.getAuditLogs()).toEqual([
      expect.objectContaining({ action: "SUBSCRIPTION_GRANTED" }),
    ]);
  });

  it("is idempotent across repeated calls", async () => {
    const userId = "user-repeat";
    const product = testDb.helpers.createProduct();
    const plan = testDb.helpers.createPlan({ productId: product.id });
    const price = testDb.helpers.createPrice({ planId: plan.id, productId: product.id });
    const session = testDb.helpers.createSession({ userId, priceId: price.id });
    const payment = testDb.helpers.createPayment({ userId, checkoutSessionId: session.id });

    const first = await applyPaymentToSubscription({ paymentId: payment.id });
    const second = await applyPaymentToSubscription({ paymentId: payment.id });

    expect(first.applied).toBe(true);
    expect(second).toEqual({ applied: false, reason: "ALREADY_GRANTED" });
    expect(testDb.helpers.getEntitlements()).toHaveLength(1);
    expect(testDb.helpers.getAuditLogs()).toEqual([
      expect.objectContaining({ action: "SUBSCRIPTION_GRANTED" }),
      expect.objectContaining({ action: "SUBSCRIPTION_DUPLICATE_GUARD" }),
    ]);
    expect(revalidateMock).toHaveBeenCalledTimes(1);
  });
});

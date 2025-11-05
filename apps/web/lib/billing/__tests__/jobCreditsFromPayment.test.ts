import { PaymentStatus, Prisma, ProductType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/entitlements/revalidate", () => ({
  revalidateJobCreditViews: revalidateMock,
}));

type PaymentRecord = {
  id: string;
  userId: string;
  status: PaymentStatus;
  checkoutSessionId: string;
};

type SessionRecord = {
  id: string;
  userId: string;
  priceId: string | null;
  providerInitPayload?: unknown;
};

type PriceRecord = {
  id: string;
  productId: string | null;
  metadata?: unknown;
};

type ProductRecord = {
  id: string;
  type: ProductType;
  metadata?: unknown;
};

type EntitlementRecord = {
  id: string;
  userId: string;
  key: string;
  remainingCredits: number;
  expiresAt: Date | null;
};

type GrantRecord = {
  id: string;
  userId: string;
  paymentId: string;
  credits: number;
  reason: string;
};

type ProductInclude =
  | true
  | {
      include?: {
        product?: boolean;
      };
    };

type SessionInclude =
  | true
  | {
      include?: {
        price?: ProductInclude;
      };
    };

type PaymentInclude = {
  session?: SessionInclude;
};

type PriceWithProduct = PriceRecord & { product?: ProductRecord | null };

type SessionWithRelations = SessionRecord & { price?: PriceWithProduct | null };

type PaymentWithRelations = PaymentRecord & { session?: SessionWithRelations | null };

type AuditLogData = {
  actorId: string;
  actorEmail: string | null;
  resourceType: string;
  resourceId: string;
  action: string;
  reason: string;
  before: unknown;
  after: unknown;
  metadata: unknown;
  idempotencyKey: string;
};

type AuditLogRecord = AuditLogData & { id: string };

type EntitlementSelect = {
  id?: boolean;
  remainingCredits?: boolean;
};

type EntitlementUpdateArgs = {
  where: { id: string };
  data: {
    remainingCredits?: { increment?: number };
  };
  select?: EntitlementSelect;
};

type EntitlementCreateArgs = {
  data: {
    userId: string;
    key: string;
    remainingCredits?: number;
    expiresAt?: Date | null;
  };
  select?: EntitlementSelect;
};

type EntitlementFindFirstArgs = {
  where: {
    userId: string;
    key: string;
    expiresAt?: Date | null;
  };
  select?: EntitlementSelect;
};

type EntitlementResult<Select extends EntitlementSelect | undefined> = Select extends undefined
  ? EntitlementRecord
  : {
      [Key in keyof EntitlementRecord as Key extends keyof Select
        ? Select[Key] extends true
          ? Key
          : never
        : never]: EntitlementRecord[Key];
    } extends infer Picked
    ? keyof Picked extends never
      ? EntitlementRecord
      : Picked
    : never;

type PrismaMock = {
  payment: {
    findUnique: ({
      where,
      include,
    }: {
      where: { id: string };
      include?: PaymentInclude;
    }) => Promise<PaymentWithRelations | null>;
  };
  jobCreditGrant: {
    create: ({ data }: { data: Omit<GrantRecord, "id"> }) => Promise<GrantRecord>;
  };
  auditLog: {
    create: ({ data }: { data: AuditLogData }) => Promise<AuditLogRecord>;
  };
  userEntitlement: {
    findFirst: <Select extends EntitlementSelect | undefined>(args: EntitlementFindFirstArgs & {
      select?: Select;
    }) => Promise<EntitlementResult<Select> | null>;
    update: <Select extends EntitlementSelect | undefined>(args: EntitlementUpdateArgs & {
      select?: Select;
    }) => Promise<EntitlementResult<Select>>;
    create: <Select extends EntitlementSelect | undefined>(args: EntitlementCreateArgs & {
      select?: Select;
    }) => Promise<EntitlementResult<Select>>;
  };
  $transaction<T>(callback: (tx: PrismaMock) => Promise<T>): Promise<T>;
};

const normalizeSessionInclude = (
  include?: SessionInclude,
): {
  include?: {
    price?: {
      include?: {
        product?: boolean;
      };
    };
  };
} | undefined => {
  if (!include) {
    return undefined;
  }
  if (include === true) {
    return { include: {} };
  }
  return include;
};

const normalizePriceInclude = (
  include?: ProductInclude,
): {
  include?: {
    product?: boolean;
  };
} | undefined => {
  if (!include) {
    return undefined;
  }
  if (include === true) {
    return { include: {} };
  }
  return include;
};

const applyEntitlementSelect = <Select extends EntitlementSelect | undefined>(
  record: EntitlementRecord,
  select: Select,
): EntitlementResult<Select> => {
  if (!select || Object.keys(select).length === 0) {
    return { ...record } as EntitlementResult<Select>;
  }
  const selection: Partial<EntitlementRecord> = {};
  if (select.id) {
    selection.id = record.id;
  }
  if (select.remainingCredits) {
    selection.remainingCredits = record.remainingCredits;
  }
  if (Object.keys(selection).length === 0) {
    return { ...record } as EntitlementResult<Select>;
  }
  return selection as EntitlementResult<Select>;
};

function createTestPrisma() {
  let idCounter = 1;
  const nextId = (prefix: string) => `${prefix}_${idCounter++}`;

  const payments = new Map<string, PaymentRecord>();
  const sessions = new Map<string, SessionRecord>();
  const prices = new Map<string, PriceRecord>();
  const products = new Map<string, ProductRecord>();
  const entitlements = new Map<string, EntitlementRecord>();
  const grants = new Map<string, GrantRecord>();
  const grantsByPayment = new Map<string, GrantRecord>();
  const auditLogs: AuditLogRecord[] = [];

  const prismaMock: PrismaMock = {
    payment: {
      findUnique: async ({ where, include }) => {
        const record = payments.get(where.id);
        if (!record) {
          return null;
        }

        const base: PaymentWithRelations = { ...record };
        const sessionInclude = normalizeSessionInclude(include?.session);

        if (sessionInclude) {
          const session = sessions.get(record.checkoutSessionId) ?? null;
          if (!session) {
            base.session = null;
          } else {
            const sessionResult: SessionWithRelations = { ...session };
            const priceInclude = normalizePriceInclude(sessionInclude.include?.price);

            if (priceInclude) {
              const price = session.priceId ? prices.get(session.priceId) ?? null : null;
              if (!price) {
                sessionResult.price = null;
              } else {
                const priceResult: PriceWithProduct = { ...price };
                const includeProduct = priceInclude.include?.product ?? false;
                if (includeProduct) {
                  priceResult.product = price.productId
                    ? products.get(price.productId) ?? null
                    : null;
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
    jobCreditGrant: {
      create: async ({ data }) => {
        if (grantsByPayment.has(data.paymentId)) {
          const error = new Prisma.PrismaClientKnownRequestError(
            "Unique constraint failed",
            { code: "P2002", clientVersion: "test" },
          );
          return Promise.reject(error);
        }
        const created: GrantRecord = { ...data, id: nextId("grant") };
        grants.set(created.id, created);
        grantsByPayment.set(created.paymentId, created);
        return { ...created };
      },
    },
    auditLog: {
      create: async ({ data }) => {
        const record: AuditLogRecord = { ...data, id: nextId("audit") };
        auditLogs.push(record);
        return record;
      },
    },
    userEntitlement: {
      findFirst: async ({ where, select }) => {
        const result =
          Array.from(entitlements.values()).find((item) => {
            if (item.userId !== where.userId) {
              return false;
            }
            if (item.key !== where.key) {
              return false;
            }
            if (where.expiresAt === undefined) {
              return true;
            }
            return item.expiresAt === where.expiresAt;
          }) ?? null;

        if (!result) {
          return null;
        }
        return applyEntitlementSelect(result, select);
      },
      update: async ({ where, data, select }) => {
        const record = entitlements.get(where.id);
        if (!record) {
          throw new Error("Entitlement not found");
        }
        const increment = data.remainingCredits?.increment ?? 0;
        const updated: EntitlementRecord = {
          ...record,
          remainingCredits: record.remainingCredits + increment,
        };
        entitlements.set(updated.id, updated);
        return applyEntitlementSelect(updated, select);
      },
      create: async ({ data, select }) => {
        const created: EntitlementRecord = {
          id: nextId("entitlement"),
          userId: data.userId,
          key: data.key,
          remainingCredits: data.remainingCredits ?? 0,
          expiresAt: data.expiresAt ?? null,
        };
        entitlements.set(created.id, created);
        return applyEntitlementSelect(created, select);
      },
    },
    $transaction: async (callback) => callback(prismaMock),
  };

  const helpers = {
    createProduct: (values: Partial<ProductRecord> = {}) => {
      const record: ProductRecord = {
        id: nextId("product"),
        type: values.type ?? ProductType.SUBSCRIPTION,
        metadata: values.metadata,
      };
      products.set(record.id, record);
      return record;
    },
    createPrice: (values: Partial<PriceRecord> = {}) => {
      const record: PriceRecord = {
        id: nextId("price"),
        productId: values.productId ?? null,
        metadata: values.metadata,
      };
      prices.set(record.id, record);
      return record;
    },
    createSession: (values: Partial<SessionRecord> & { userId: string }) => {
      const record: SessionRecord = {
        id: nextId("session"),
        userId: values.userId,
        priceId: values.priceId ?? null,
        providerInitPayload: values.providerInitPayload,
      };
      sessions.set(record.id, record);
      return record;
    },
    createPayment: (values: Partial<PaymentRecord> & { userId: string }) => {
      const record: PaymentRecord = {
        id: nextId("payment"),
        userId: values.userId,
        status: values.status ?? PaymentStatus.PAID,
        checkoutSessionId: values.checkoutSessionId ?? nextId("session"),
      };
      payments.set(record.id, record);
      if (!sessions.has(record.checkoutSessionId)) {
        sessions.set(record.checkoutSessionId, {
          id: record.checkoutSessionId,
          userId: record.userId,
          priceId: null,
        });
      }
      return record;
    },
    getEntitlements: () => Array.from(entitlements.values()),
    getGrants: () => Array.from(grants.values()),
    getAuditLogs: () => [...auditLogs],
    reset() {
      payments.clear();
      sessions.clear();
      prices.clear();
      products.clear();
      entitlements.clear();
      grants.clear();
      grantsByPayment.clear();
      auditLogs.length = 0;
      idCounter = 1;
    },
  };

  return { prisma: prismaMock, helpers };
}

const testDb = vi.hoisted(createTestPrisma);

vi.mock("@/lib/prisma", () => ({ prisma: testDb.prisma }));

const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

const { applyPaymentToJobCredits } = await import("../paymentToJobCredits");

describe("applyPaymentToJobCredits", () => {
  beforeEach(() => {
    testDb.helpers.reset();
    revalidateMock.mockReset();
    infoSpy.mockClear();
  });

  it("returns early when payment is missing", async () => {
    const result = await applyPaymentToJobCredits({ paymentId: "missing" });
    expect(result).toEqual({ applied: false, reason: "PAYMENT_NOT_FOUND" });
    expect(revalidateMock).not.toHaveBeenCalled();
  });

  it("ignores payments that are not paid", async () => {
    const payment = testDb.helpers.createPayment({
      userId: "user-1",
      status: PaymentStatus.PENDING,
    });
    const result = await applyPaymentToJobCredits({ paymentId: payment.id });
    expect(result).toEqual({ applied: false, reason: "PAYMENT_NOT_PAID" });
  });

  it("skips non job credit products", async () => {
    const product = testDb.helpers.createProduct({ type: ProductType.SUBSCRIPTION });
    const price = testDb.helpers.createPrice({ productId: product.id });
    const session = testDb.helpers.createSession({ userId: "user-2", priceId: price.id });
    const payment = testDb.helpers.createPayment({
      userId: "user-2",
      checkoutSessionId: session.id,
    });

    const result = await applyPaymentToJobCredits({ paymentId: payment.id });
    expect(result).toEqual({ applied: false, reason: "NOT_JOB_PRODUCT" });
  });

  it("creates a ledger entry and entitlement when granting credits", async () => {
    const userId = "user-job";
    const product = testDb.helpers.createProduct({ type: ProductType.JOB_POST });
    const price = testDb.helpers.createPrice({ productId: product.id });
    const session = testDb.helpers.createSession({ userId, priceId: price.id });
    const payment = testDb.helpers.createPayment({ userId, checkoutSessionId: session.id });

    const result = await applyPaymentToJobCredits({ paymentId: payment.id });

    expect(result.applied).toBe(true);
    if (result.applied) {
      expect(result.creditsGranted).toBe(1);
      expect(result.newBalance).toBe(1);
    }
    expect(testDb.helpers.getGrants()).toHaveLength(1);
    expect(testDb.helpers.getEntitlements()).toEqual([
      expect.objectContaining({ userId, remainingCredits: 1 }),
    ]);
    expect(revalidateMock).toHaveBeenCalledWith(userId);
    expect(testDb.helpers.getAuditLogs()).toEqual([
      expect.objectContaining({ action: "JOB_CREDIT_GRANTED" }),
    ]);
  });

  it("increments existing entitlement", async () => {
    const userId = "user-existing";
    const product = testDb.helpers.createProduct({ type: ProductType.JOB_POST });
    const price = testDb.helpers.createPrice({ productId: product.id });
    const session = testDb.helpers.createSession({ userId, priceId: price.id });
    const payment = testDb.helpers.createPayment({ userId, checkoutSessionId: session.id });

    // Pre-create entitlement with remaining credits
    const entitlementResult = await testDb.prisma.userEntitlement.create({
      data: {
        userId,
        key: "JOB_POST_CREDIT",
        remainingCredits: 2,
        expiresAt: null,
      },
    });

    expect(entitlementResult.remainingCredits).toBe(2);

    const result = await applyPaymentToJobCredits({ paymentId: payment.id });

    expect(result.applied).toBe(true);
    if (result.applied) {
      expect(result.newBalance).toBe(3);
    }
    expect(testDb.helpers.getEntitlements()).toEqual([
      expect.objectContaining({ remainingCredits: 3 }),
    ]);
  });

  it("is idempotent across repeated calls", async () => {
    const userId = "user-repeat";
    const product = testDb.helpers.createProduct({ type: ProductType.JOB_POST });
    const price = testDb.helpers.createPrice({ productId: product.id });
    const session = testDb.helpers.createSession({ userId, priceId: price.id });
    const payment = testDb.helpers.createPayment({ userId, checkoutSessionId: session.id });

    const first = await applyPaymentToJobCredits({ paymentId: payment.id });
    const second = await applyPaymentToJobCredits({ paymentId: payment.id });

    expect(first.applied).toBe(true);
    expect(second).toEqual({ applied: false, reason: "ALREADY_GRANTED" });
    expect(testDb.helpers.getGrants()).toHaveLength(1);
    expect(revalidateMock).toHaveBeenCalledTimes(1);
    expect(testDb.helpers.getAuditLogs()).toEqual([
      expect.objectContaining({ action: "JOB_CREDIT_GRANTED" }),
      expect.objectContaining({ action: "JOB_CREDIT_DUPLICATE_GUARD" }),
    ]);
  });
});

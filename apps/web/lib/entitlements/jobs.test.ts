import { EntitlementKey } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ExpiredJobCreditsError,
  InsufficientJobCreditsError,
  NoEntitlementError,
  TransientConcurrencyError,
} from "@/lib/errors";
import {
  assertHasJobCreditOrThrow,
  consumeJobCreditTx,
  getJobCreditSummary,
  hasJobCredit,
} from "@/lib/entitlements/jobs";

const mockPrisma = {
  userEntitlement: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

type MutableEntitlement = {
  id: string;
  userId: string;
  key: EntitlementKey;
  remainingCredits: number;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type Barrier = {
  wait: () => Promise<void>;
};

function createBarrier(expected: number): Barrier {
  let count = 0;
  let release: (() => void) | null = null;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  return {
    async wait() {
      count += 1;

      if (count >= expected) {
        release?.();
      }

      await gate;
    },
  };
}

function matchesWhere(record: MutableEntitlement, where: any): boolean {
  if (!where) {
    return true;
  }

  const { OR, userId_key, remainingCredits, expiresAt, ...rest } = where;

  if (userId_key) {
    if (
      record.userId !== userId_key.userId ||
      record.key !== userId_key.key
    ) {
      return false;
    }
  }

  if (typeof rest.id !== "undefined" && record.id !== rest.id) {
    return false;
  }

  if (typeof rest.userId !== "undefined" && record.userId !== rest.userId) {
    return false;
  }

  if (typeof rest.key !== "undefined" && record.key !== rest.key) {
    return false;
  }

  if (
    remainingCredits?.gt !== undefined &&
    !(record.remainingCredits > remainingCredits.gt)
  ) {
    return false;
  }

  if (expiresAt !== undefined) {
    if (expiresAt === null) {
      if (record.expiresAt !== null) {
        return false;
      }
    } else if (typeof expiresAt === "object" && "gt" in expiresAt) {
      if (record.expiresAt === null || !(record.expiresAt > expiresAt.gt)) {
        return false;
      }
    }
  }

  if (OR) {
    if (!OR.some((clause: any) => matchesWhere(record, clause))) {
      return false;
    }
  }

  return true;
}

function selectFields(record: MutableEntitlement, select: Record<string, boolean>) {
  return Object.fromEntries(
    Object.entries(select)
      .filter(([, enabled]) => enabled)
      .map(([key]) => [key, record[key as keyof MutableEntitlement]]),
  );
}

function createTransaction(
  records: MutableEntitlement[],
  options: { barrier?: Barrier } = {},
) {
  const userEntitlement = {
    async findMany(args: any) {
      if (options.barrier) {
        await options.barrier.wait();
      }

      const filtered = records.filter((record) => matchesWhere(record, args?.where));

      const ordered = Array.isArray(args?.orderBy)
        ? [...filtered].sort((a, b) => {
            for (const order of args.orderBy) {
              if (order.expiresAt) {
                const { sort, nulls } = order.expiresAt;
                const aExp = a.expiresAt;
                const bExp = b.expiresAt;

                if (aExp === null && bExp === null) {
                  continue;
                }

                if (aExp === null) {
                  return nulls === "last" ? 1 : -1;
                }

                if (bExp === null) {
                  return nulls === "last" ? -1 : 1;
                }

                if (aExp.getTime() !== bExp.getTime()) {
                  return sort === "asc"
                    ? aExp.getTime() - bExp.getTime()
                    : bExp.getTime() - aExp.getTime();
                }
              } else if (order.updatedAt) {
                if (a.updatedAt.getTime() !== b.updatedAt.getTime()) {
                  return order.updatedAt === "asc"
                    ? a.updatedAt.getTime() - b.updatedAt.getTime()
                    : b.updatedAt.getTime() - a.updatedAt.getTime();
                }
              }
            }

            return 0;
          })
        : filtered;

      if (args?.select) {
        return ordered.map((record) => selectFields(record, args.select));
      }

      return ordered;
    },
    async findFirst(args: any) {
      const results = await this.findMany({ ...args, take: 1 });
      return results[0] ?? null;
    },
    async findUnique(args: any) {
      return (
        records.find((record) => matchesWhere(record, args?.where)) ?? null
      );
    },
    async updateMany(args: any) {
      let count = 0;

      for (const record of records) {
        if (!matchesWhere(record, args?.where)) {
          continue;
        }

        if (args?.data?.remainingCredits?.decrement) {
          record.remainingCredits -= args.data.remainingCredits.decrement;
        }

        record.updatedAt = new Date();
        count += 1;
      }

      return { count };
    },
  };

  return { userEntitlement } as unknown as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.userEntitlement.findFirst = vi.fn();
  mockPrisma.userEntitlement.findMany = vi.fn();
});

describe("hasJobCredit", () => {
  it("returns true when remaining > 0 and not expired", async () => {
    mockPrisma.userEntitlement.findFirst.mockResolvedValue({ id: "ent1" });

    const result = await hasJobCredit("user-1");

    expect(result).toBe(true);
    expect(mockPrisma.userEntitlement.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1" }),
      }),
    );
  });

  it("returns false when remaining = 0", async () => {
    mockPrisma.userEntitlement.findFirst.mockResolvedValue(null);

    const result = await hasJobCredit("user-2");

    expect(result).toBe(false);
  });

  it("returns false when expired", async () => {
    mockPrisma.userEntitlement.findFirst.mockResolvedValue(null);

    const result = await hasJobCredit("user-3");

    expect(result).toBe(false);
  });
});

describe("getJobCreditSummary", () => {
  it("aggregates active entitlements", async () => {
    const now = new Date();
    mockPrisma.userEntitlement.findMany.mockResolvedValue([
      {
        id: "ent1",
        expiresAt: new Date(now.getTime() + 1000),
        remainingCredits: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "ent2",
        expiresAt: null,
        remainingCredits: 2,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const summary = await getJobCreditSummary("user-summary");

    expect(summary).toEqual({ total: 3, remaining: 3, expiresAt: null });
  });

  it("returns null when no active entitlements", async () => {
    mockPrisma.userEntitlement.findMany.mockResolvedValue([]);

    const summary = await getJobCreditSummary("user-none");

    expect(summary).toBeNull();
  });
});

describe("assertHasJobCreditOrThrow", () => {
  it("throws when no entitlement exists", async () => {
    mockPrisma.userEntitlement.findMany.mockResolvedValue([]);

    await expect(assertHasJobCreditOrThrow("user-no-ent"))
      .rejects.toBeInstanceOf(NoEntitlementError);
  });

  it("throws InsufficientJobCreditsError when active but zero credits", async () => {
    const now = new Date();
    mockPrisma.userEntitlement.findMany.mockResolvedValue([
      {
        id: "ent1",
        expiresAt: new Date(now.getTime() + 1000),
        remainingCredits: 0,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await expect(assertHasJobCreditOrThrow("user-zero"))
      .rejects.toBeInstanceOf(InsufficientJobCreditsError);
  });

  it("throws ExpiredJobCreditsError when only expired entitlements exist", async () => {
    const now = new Date();
    mockPrisma.userEntitlement.findMany.mockResolvedValue([
      {
        id: "ent1",
        expiresAt: new Date(now.getTime() - 1000),
        remainingCredits: 2,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await expect(assertHasJobCreditOrThrow("user-expired"))
      .rejects.toBeInstanceOf(ExpiredJobCreditsError);
  });
});

describe("consumeJobCreditTx", () => {
  it("decrements exactly once within a transaction", async () => {
    const now = new Date();
    const records: MutableEntitlement[] = [
      {
        id: "ent1",
        userId: "user-tx",
        key: EntitlementKey.JOB_POST_CREDIT,
        remainingCredits: 2,
        expiresAt: new Date(now.getTime() + 1000),
        createdAt: now,
        updatedAt: now,
      },
    ];

    const tx = createTransaction(records);

    await consumeJobCreditTx("user-tx", tx);

    expect(records[0].remainingCredits).toBe(1);
  });

  it("throws when no active credit exists", async () => {
    const now = new Date();
    const records: MutableEntitlement[] = [
      {
        id: "ent1",
        userId: "user-none-active",
        key: EntitlementKey.JOB_POST_CREDIT,
        remainingCredits: 0,
        expiresAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const tx = createTransaction(records);

    await expect(consumeJobCreditTx("user-none-active", tx))
      .rejects.toBeInstanceOf(InsufficientJobCreditsError);
  });

  it("is safe under concurrency", async () => {
    const now = new Date();
    const records: MutableEntitlement[] = [
      {
        id: "ent1",
        userId: "user-concurrent",
        key: EntitlementKey.JOB_POST_CREDIT,
        remainingCredits: 1,
        expiresAt: new Date(now.getTime() + 1000),
        createdAt: now,
        updatedAt: now,
      },
    ];

    const barrier = createBarrier(2);
    const tx = createTransaction(records, { barrier });

    const [first, second] = await Promise.allSettled([
      consumeJobCreditTx("user-concurrent", tx),
      consumeJobCreditTx("user-concurrent", tx),
    ]);

    expect(first.status).toBe("fulfilled");
    expect(second.status).toBe("rejected");
    if (second.status === "rejected") {
      expect(second.reason).toBeInstanceOf(TransientConcurrencyError);
    }
    expect(records[0].remainingCredits).toBe(0);
  });
});

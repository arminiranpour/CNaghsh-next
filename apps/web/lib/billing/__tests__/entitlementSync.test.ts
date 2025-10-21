import {
  EntitlementKey,
  Prisma,
  ProfileVisibility,
  SubscriptionStatus,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { syncAllSubscriptions } from "../entitlementSync";

function createTestPrisma() {
  let idCounter = 1;
  const nextId = (prefix: string) => `${prefix}_${idCounter++}`;

  type SubscriptionRecord = {
    id: string;
    userId: string;
    status: SubscriptionStatus;
    endsAt: Date;
  };

  type EntitlementRecord = {
    id: string;
    userId: string;
    key: EntitlementKey;
    expiresAt: Date | null;
  };

  type ProfileRecord = {
    id: string;
    userId: string;
    visibility: ProfileVisibility;
    publishedAt: Date | null;
  };

  const subscriptions = new Map<string, SubscriptionRecord>();
  const subscriptionsByUser = new Map<string, string>();
  const entitlements = new Map<string, EntitlementRecord>();
  const profiles = new Map<string, ProfileRecord>();

  const applySelect = <T extends Record<string, any>>(record: T, select?: any) => {
    if (!select) {
      return { ...record };
    }
    const picked: Record<string, any> = {};
    for (const [key, value] of Object.entries(select)) {
      if (value) {
        picked[key] = (record as any)[key];
      }
    }
    return picked;
  };

  const matchesWhere = (record: SubscriptionRecord, where: any): boolean => {
    if (!where) {
      return true;
    }
    if (where.id?.in && !where.id.in.includes(record.id)) {
      return false;
    }
    if (where.endsAt?.lt && !(record.endsAt < where.endsAt.lt)) {
      return false;
    }
    if (where.status?.not && record.status === where.status.not) {
      return false;
    }
    return true;
  };

  const prismaMock = {
    subscription: {
      findMany: async ({ where, select }: { where?: any; select?: any } = {}) => {
        const results = Array.from(subscriptions.values())
          .filter((record) => matchesWhere(record, where))
          .map((record) => applySelect(record, select));
        return results;
      },
      findUnique: async ({ where, select }: { where: any; select?: any }) => {
        const id =
          where.id ?? (where.userId ? subscriptionsByUser.get(where.userId) : null);
        if (!id) {
          return null;
        }
        const record = subscriptions.get(id);
        if (!record) {
          return null;
        }
        return applySelect(record, select);
      },
      create: async ({ data }: { data: any }) => {
        const id = nextId("sub");
        const record: SubscriptionRecord = {
          id,
          userId: data.userId,
          status: data.status,
          endsAt: data.endsAt,
        };
        subscriptions.set(id, record);
        subscriptionsByUser.set(record.userId, id);
        return { ...record };
      },
      updateMany: async ({ where, data }: { where?: any; data: any }) => {
        let count = 0;
        for (const record of subscriptions.values()) {
          if (matchesWhere(record, where)) {
            if (data.status) {
              record.status = data.status;
            }
            count += 1;
          }
        }
        return { count };
      },
      update: async ({ where, data }: { where: any; data: any }) => {
        const id =
          where.id ?? (where.userId ? subscriptionsByUser.get(where.userId) : null);
        if (!id) {
          throw new Error("Subscription not found");
        }
        const record = subscriptions.get(id);
        if (!record) {
          throw new Error("Subscription not found");
        }
        if (data.status) {
          record.status = data.status;
        }
        if (data.endsAt) {
          record.endsAt = data.endsAt;
        }
        return { ...record };
      },
    },
    userEntitlement: {
      findMany: async ({ where, select }: { where?: any; select?: any } = {}) => {
        const results = Array.from(entitlements.values()).filter((record) => {
          if (!where) {
            return true;
          }
          if (where.key && record.key !== where.key) {
            return false;
          }
          if (where.userId && record.userId !== where.userId) {
            return false;
          }
          return true;
        });
        return results.map((record) => applySelect(record, select));
      },
      findFirst: async ({ where, orderBy, select }: any) => {
        const filtered = Array.from(entitlements.values()).filter((record) => {
          if (where?.userId && record.userId !== where.userId) {
            return false;
          }
          if (where?.key && record.key !== where.key) {
            return false;
          }
          return true;
        });
        if (orderBy?.expiresAt === "desc") {
          filtered.sort((a, b) => {
            const aTime = a.expiresAt ? a.expiresAt.getTime() : -Infinity;
            const bTime = b.expiresAt ? b.expiresAt.getTime() : -Infinity;
            return bTime - aTime;
          });
        }
        const record = filtered[0];
        if (!record) {
          return null;
        }
        return applySelect(record, select);
      },
      create: async ({ data }: { data: any }) => {
        for (const record of entitlements.values()) {
          if (
            record.userId === data.userId &&
            record.key === data.key &&
            ((record.expiresAt === null && data.expiresAt === null) ||
              (record.expiresAt &&
                data.expiresAt &&
                record.expiresAt.getTime() === data.expiresAt.getTime()))
          ) {
            throw new Prisma.PrismaClientKnownRequestError(
              "Unique constraint failed",
              {
                code: "P2002",
                clientVersion: "test",
              },
            );
          }
        }
        const id = nextId("ent");
        const record: EntitlementRecord = {
          id,
          userId: data.userId,
          key: data.key,
          expiresAt: data.expiresAt ?? null,
        };
        entitlements.set(id, record);
        return { ...record };
      },
      update: async ({ where, data }: { where: any; data: any }) => {
        const record = entitlements.get(where.id);
        if (!record) {
          throw new Error("Entitlement not found");
        }
        if (data.expiresAt !== undefined) {
          record.expiresAt = data.expiresAt;
        }
        return { ...record };
      },
    },
    profile: {
      findUnique: async ({ where, select }: { where: any; select?: any }) => {
        const record = Array.from(profiles.values()).find(
          (profile) => profile.userId === where.userId,
        );
        if (!record) {
          return null;
        }
        return applySelect(record, select);
      },
      create: async ({ data }: { data: any }) => {
        const id = nextId("profile");
        const record: ProfileRecord = {
          id,
          userId: data.userId,
          visibility: data.visibility,
          publishedAt: data.publishedAt ?? null,
        };
        profiles.set(id, record);
        return { ...record };
      },
      update: async ({ where, data }: { where: any; data: any }) => {
        const record = Array.from(profiles.values()).find(
          (profile) => profile.userId === where.userId,
        );
        if (!record) {
          throw new Error("Profile not found");
        }
        if (data.visibility) {
          record.visibility = data.visibility;
        }
        if (data.publishedAt !== undefined) {
          record.publishedAt = data.publishedAt;
        }
        return { ...record };
      },
    },
    $transaction: async (callback: (tx: any) => any) => {
      return callback(prismaMock);
    },
  } satisfies Partial<PrismaClientMock> as any;

  type PrismaClientMock = {
    subscription: any;
    userEntitlement: any;
    profile: any;
    $transaction: any;
  };

  const helpers = {
    createUser: () => ({ id: nextId("user") }),
    createSubscription: ({
      userId,
      status = SubscriptionStatus.active,
      endsAt,
    }: {
      userId: string;
      status?: SubscriptionStatus;
      endsAt: Date;
    }) => {
      const record: SubscriptionRecord = {
        id: nextId("sub"),
        userId,
        status,
        endsAt,
      };
      subscriptions.set(record.id, record);
      subscriptionsByUser.set(userId, record.id);
      return record;
    },
    updateSubscription: (userId: string, data: Partial<SubscriptionRecord>) => {
      const id = subscriptionsByUser.get(userId);
      if (!id) {
        throw new Error("Subscription not found");
      }
      const record = subscriptions.get(id)!;
      if (data.status) {
        record.status = data.status;
      }
      if (data.endsAt) {
        record.endsAt = data.endsAt;
      }
      return record;
    },
    createProfile: ({
      userId,
      visibility = ProfileVisibility.PUBLIC,
      publishedAt = new Date(),
    }: {
      userId: string;
      visibility?: ProfileVisibility;
      publishedAt?: Date | null;
    }) => {
      const record: ProfileRecord = {
        id: nextId("profile"),
        userId,
        visibility,
        publishedAt: publishedAt ?? null,
      };
      profiles.set(record.id, record);
      return record;
    },
    getProfile: (userId: string) => {
      return Array.from(profiles.values()).find((profile) => profile.userId === userId);
    },
    getSubscription: (userId: string) => {
      const id = subscriptionsByUser.get(userId);
      return id ? subscriptions.get(id) ?? null : null;
    },
    getEntitlement: (userId: string) => {
      return Array.from(entitlements.values()).find(
        (entitlement) => entitlement.userId === userId,
      );
    },
    clear: () => {
      subscriptions.clear();
      subscriptionsByUser.clear();
      entitlements.clear();
      profiles.clear();
      idCounter = 1;
    },
  };

  return { prisma: prismaMock, helpers };
}

const testDb = vi.hoisted(createTestPrisma);

vi.mock("@/lib/prisma", () => ({ prisma: testDb.prisma }));

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

describe("entitlementSync", () => {
  const baseNow = new Date("2025-01-01T00:00:00.000Z");
  let user: { id: string };

  beforeEach(() => {
    testDb.helpers.clear();
    user = testDb.helpers.createUser();
    testDb.helpers.createProfile({ userId: user.id });
    testDb.helpers.createSubscription({
      userId: user.id,
      endsAt: new Date(baseNow.getTime() + THIRTY_DAYS),
      status: SubscriptionStatus.active,
    });
  });

  it("grants entitlement for active subscription", async () => {
    const summary = await syncAllSubscriptions(new Date(baseNow));

    expect(summary.entitlementsGranted).toBe(1);
    expect(summary.entitlementsRevoked).toBe(0);

    const entitlement = testDb.helpers.getEntitlement(user.id);
    expect(entitlement).toBeTruthy();
    expect(entitlement?.expiresAt?.toISOString()).toBe(
      new Date(baseNow.getTime() + THIRTY_DAYS).toISOString(),
    );

    const profile = testDb.helpers.getProfile(user.id);
    expect(profile?.visibility).toBe(ProfileVisibility.PUBLIC);
  });

  it("expires subscription and revokes entitlement when past endsAt", async () => {
    await syncAllSubscriptions(new Date(baseNow));

    testDb.helpers.updateSubscription(user.id, {
      endsAt: new Date(baseNow.getTime() - 1000),
      status: SubscriptionStatus.active,
    });

    const summary = await syncAllSubscriptions(new Date(baseNow));

    expect(summary.expiredMarked).toBe(1);
    expect(summary.entitlementsRevoked).toBe(1);
    expect(summary.profilesUnpublished).toBe(1);

    const subscription = testDb.helpers.getSubscription(user.id);
    expect(subscription?.status).toBe(SubscriptionStatus.expired);

    const entitlement = testDb.helpers.getEntitlement(user.id);
    expect(entitlement?.expiresAt).toBeTruthy();
    expect(entitlement?.expiresAt && entitlement?.expiresAt <= baseNow).toBe(true);

    const profile = testDb.helpers.getProfile(user.id);
    expect(profile?.visibility).toBe(ProfileVisibility.PRIVATE);
  });

  it("updates entitlement expiry on renewal", async () => {
    await syncAllSubscriptions(new Date(baseNow));

    const newEndsAt = new Date(baseNow.getTime() + THIRTY_DAYS * 2);
    testDb.helpers.updateSubscription(user.id, {
      endsAt: newEndsAt,
      status: SubscriptionStatus.active,
    });

    const summary = await syncAllSubscriptions(new Date(baseNow));
    expect(summary.entitlementsGranted).toBe(0);

    const entitlement = testDb.helpers.getEntitlement(user.id);
    expect(entitlement?.expiresAt?.toISOString()).toBe(newEndsAt.toISOString());

    const profile = testDb.helpers.getProfile(user.id);
    expect(profile?.visibility).toBe(ProfileVisibility.PUBLIC);
  });

  it("is idempotent", async () => {
    const first = await syncAllSubscriptions(new Date(baseNow));
    expect(first.entitlementsGranted).toBe(1);

    const second = await syncAllSubscriptions(new Date(baseNow));
    expect(second.entitlementsGranted).toBe(0);
    expect(second.entitlementsRevoked).toBe(0);

    const entitlement = testDb.helpers.getEntitlement(user.id);
    expect(entitlement?.expiresAt?.toISOString()).toBe(
      new Date(baseNow.getTime() + THIRTY_DAYS).toISOString(),
    );
  });

  it("revokes entitlement when canceled", async () => {
    await syncAllSubscriptions(new Date(baseNow));

    testDb.helpers.updateSubscription(user.id, {
      status: SubscriptionStatus.canceled,
    });

    const summary = await syncAllSubscriptions(new Date(baseNow));
    expect(summary.entitlementsRevoked).toBe(1);
    expect(summary.profilesUnpublished).toBe(1);

    const entitlement = testDb.helpers.getEntitlement(user.id);
    expect(entitlement?.expiresAt).toBeTruthy();
    expect(entitlement?.expiresAt && entitlement?.expiresAt <= baseNow).toBe(true);

    const profile = testDb.helpers.getProfile(user.id);
    expect(profile?.visibility).toBe(ProfileVisibility.PRIVATE);
  });
});

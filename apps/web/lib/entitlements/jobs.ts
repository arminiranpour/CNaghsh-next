import type { Prisma } from "@prisma/client";
import { EntitlementKey } from "@prisma/client";

import {
  ExpiredJobCreditsError,
  InsufficientJobCreditsError,
  NoEntitlementError,
  TransientConcurrencyError,
} from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const JOB_POST_ENTITLEMENT_KEY = EntitlementKey.JOB_POST_CREDIT;

const activeWindowCondition = (now: Date) => [
  { expiresAt: null },
  { expiresAt: { gt: now } },
];

const entitlementSelect = {
  id: true,
  expiresAt: true,
  remainingCredits: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserEntitlementSelect;

type JobEntitlementRecord = Prisma.UserEntitlementGetPayload<{
  select: typeof entitlementSelect;
}>;

type EntitlementClient = {
  userEntitlement: {
    findMany(
      args: Prisma.UserEntitlementFindManyArgs,
    ): Promise<JobEntitlementRecord[]> | Prisma.PrismaPromise<JobEntitlementRecord[]>;
  };
};

function isWithinActiveWindow(entitlement: JobEntitlementRecord, now: Date) {
  return entitlement.expiresAt === null || entitlement.expiresAt > now;
}

function hasRemainingCredits(entitlement: JobEntitlementRecord) {
  return (entitlement.remainingCredits ?? 0) > 0;
}

/**
 * Sort entitlements so we always consume the bundle that expires the soonest.
 * Null expirations (no expiry) are treated as the most permissive option and
 * evaluated last. Ties are broken deterministically via updatedAt.
 */
function sortForConsumption(
  entitlements: JobEntitlementRecord[],
): JobEntitlementRecord[] {
  return [...entitlements].sort((a, b) => {
    const aExpires = a.expiresAt;
    const bExpires = b.expiresAt;

    if (aExpires === null && bExpires === null) {
      return a.updatedAt.getTime() - b.updatedAt.getTime();
    }

    if (aExpires === null) {
      return 1;
    }

    if (bExpires === null) {
      return -1;
    }

    const diff = aExpires.getTime() - bExpires.getTime();

    if (diff !== 0) {
      return diff;
    }

    return a.updatedAt.getTime() - b.updatedAt.getTime();
  });
}

async function fetchJobEntitlements(
  client: EntitlementClient,
  userId: string,
): Promise<JobEntitlementRecord[]> {
  return client.userEntitlement.findMany({
    where: {
      userId,
      key: JOB_POST_ENTITLEMENT_KEY,
    },
    select: entitlementSelect,
  });
}

function evaluateEntitlements(
  entitlements: JobEntitlementRecord[],
  now: Date,
) {
  const withinWindow = entitlements.filter((entitlement) =>
    isWithinActiveWindow(entitlement, now),
  );
  const withCredits = withinWindow.filter((entitlement) =>
    hasRemainingCredits(entitlement),
  );
  const expired = entitlements.filter(
    (entitlement) => entitlement.expiresAt && entitlement.expiresAt <= now,
  );

  return { withinWindow, withCredits, expired };
}

export async function hasJobCredit(userId: string): Promise<boolean> {
  const now = new Date();
  const entitlement = await prisma.userEntitlement.findFirst({
    where: {
      userId,
      key: JOB_POST_ENTITLEMENT_KEY,
      remainingCredits: { gt: 0 },
      OR: activeWindowCondition(now),
    },
    select: { id: true },
  });

  return entitlement !== null;
}

export async function getJobCreditSummary(
  userId: string,
): Promise<{ total: number; remaining: number; expiresAt: Date | null } | null> {
  const now = new Date();
  const entitlements = await fetchJobEntitlements(prisma, userId);
  const { withinWindow } = evaluateEntitlements(entitlements, now);

  if (withinWindow.length === 0) {
    return null;
  }

  // Remaining credits are the only tracked value today, so total mirrors remaining.
  const total = withinWindow.reduce(
    (sum, entitlement) => sum + (entitlement.remainingCredits ?? 0),
    0,
  );

  const expiresAt = determineSummaryExpiry(withinWindow);

  return {
    total,
    remaining: total,
    expiresAt,
  };
}

function determineSummaryExpiry(
  entitlements: JobEntitlementRecord[],
): Date | null {
  if (entitlements.some((entitlement) => entitlement.expiresAt === null)) {
    return null;
  }

  const sorted = sortForConsumption(entitlements);
  return sorted[0]?.expiresAt ?? null;
}

export async function assertHasJobCreditOrThrow(userId: string): Promise<void> {
  const now = new Date();
  const entitlements = await fetchJobEntitlements(prisma, userId);

  if (entitlements.length === 0) {
    throw new NoEntitlementError();
  }

  const { withinWindow, withCredits, expired } = evaluateEntitlements(
    entitlements,
    now,
  );

  if (withCredits.length > 0) {
    return;
  }

  if (withinWindow.length > 0) {
    throw new InsufficientJobCreditsError();
  }

  if (expired.length > 0) {
    throw new ExpiredJobCreditsError();
  }

  throw new NoEntitlementError();
}

export async function consumeJobCreditTx(
  userId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  const now = new Date();
  const entitlements = await fetchJobEntitlements(tx, userId);

  if (entitlements.length === 0) {
    console.debug("[entitlements.jobs] no_entitlement", { userId });
    throw new NoEntitlementError();
  }

  const { withinWindow, withCredits, expired } = evaluateEntitlements(
    entitlements,
    now,
  );

  if (withCredits.length === 0) {
    const reason: "insufficient" | "expired" | "missing" = withinWindow.length
      ? "insufficient"
      : expired.length
        ? "expired"
        : "missing";

    console.debug("[entitlements.jobs] no_active_credit", {
      userId,
      reason,
    });

    if (reason === "insufficient") {
      throw new InsufficientJobCreditsError();
    }

    if (reason === "expired") {
      throw new ExpiredJobCreditsError();
    }

    throw new NoEntitlementError();
  }

  const [target] = sortForConsumption(withCredits);
  const updateResult = await tx.userEntitlement.updateMany({
    where: {
      id: target.id,
      userId,
      key: JOB_POST_ENTITLEMENT_KEY,
      remainingCredits: { gt: 0 },
      OR: activeWindowCondition(now),
    },
    data: {
      remainingCredits: { decrement: 1 },
    },
  });

  if (updateResult.count === 0) {
    console.debug("[entitlements.jobs] concurrency_conflict", {
      userId,
      entitlementId: target.id,
    });

    throw new TransientConcurrencyError();
  }

  const remainingAfterConsumption = Math.max(
    (target.remainingCredits ?? 0) - 1,
    0,
  );

  console.debug("[entitlements.jobs] credit_consumed", {
    userId,
    entitlementId: target.id,
    remaining: remainingAfterConsumption,
  });
}

export function onJobCreditConsumed(
  _userId: string,
  _jobId: string,
): void {
  void _userId;
  void _jobId;
  // Placeholder for future notification or analytics hooks.
}

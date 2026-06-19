import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const baseChallengeSelect = {
  id: true,
  title: true,
  location: true,
  summary: true,
  startDate: true,
  endDate: true,
  conditions: true,
  mediaLengthLimitSec: true,
  instructions: true,
  priceIrr: true,
  prerequisite: true,
  howHeld: true,
  sideNote: true,
  status: true,
  coverMediaAsset: {
    select: {
      id: true,
      outputKey: true,
      visibility: true,
    },
  },
  instructionVideoMediaAsset: {
    select: {
      id: true,
      outputKey: true,
      posterKey: true,
      visibility: true,
    },
  },
} satisfies Prisma.ChallengeSelect;

const buildChallengeSelect = (userId?: string | null) => {
  return {
    ...baseChallengeSelect,
    participations: {
      where: { userId: userId ?? "__anonymous__" },
      take: 1,
      select: {
        id: true,
        status: true,
        submissionMediaAssetId: true,
        description: true,
        updatedAt: true,
        submissionMediaAsset: {
          select: {
            id: true,
            outputKey: true,
            posterKey: true,
            visibility: true,
            status: true,
            durationSec: true,
          },
        },
      },
    },
    checkoutSessions: {
      where: {
        userId: userId ?? "__anonymous__",
        purchaseType: "challenge_participation",
      },
      orderBy: { updatedAt: "desc" },
      take: 1,
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    },
  } satisfies Prisma.ChallengeSelect;
};

const buildChallengeListWhere = () =>
  ({
    status: "published",
    endDate: {
      gte: new Date(),
    },
  }) satisfies Prisma.ChallengeWhereInput;

export async function fetchPublishedChallenges({
  page = 1,
  pageSize = 12,
}: {
  page?: number;
  pageSize?: number;
}) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 12;

  const items = await prisma.challenge.findMany({
    where: buildChallengeListWhere(),
    select: {
      id: true,
      title: true,
      location: true,
      summary: true,
      startDate: true,
      endDate: true,
      priceIrr: true,
      coverMediaAsset: {
        select: {
          id: true,
          outputKey: true,
          visibility: true,
        },
      },
    },
    orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
    skip: (safePage - 1) * safeSize,
    take: safeSize + 1,
  });

  const hasNextPage = items.length > safeSize;
  const sliced = hasNextPage ? items.slice(0, safeSize) : items;

  return {
    items: sliced,
    page: safePage,
    pageSize: safeSize,
    hasNextPage,
    hasPrevPage: safePage > 1,
  };
}

export async function fetchPublicChallengeById(challengeId: string, userId?: string | null) {
  const challenge = await prisma.challenge.findFirst({
    where: {
      id: challengeId,
      status: "published",
    },
    select: buildChallengeSelect(userId),
  });

  if (!challenge) {
    return null;
  }

  const viewerParticipation =
    challenge.participations[0] ?? null;
  const viewerCheckoutSession =
    challenge.checkoutSessions[0] ?? null;

  return {
    ...challenge,
    viewerParticipation,
    viewerCheckoutSession,
  };
}

export async function fetchPublishedChallengeSitemapEntries(limit = 5000) {
  return prisma.challenge.findMany({
    where: buildChallengeListWhere(),
    select: {
      id: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

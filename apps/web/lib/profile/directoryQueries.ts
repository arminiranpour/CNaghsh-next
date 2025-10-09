import { unstable_cache } from "next/cache";

import { CAN_PUBLISH_PROFILE } from "@/lib/billing/entitlementKeys";
import { CACHE_REVALIDATE, CACHE_TAGS, shouldBypassCache } from "@/lib/cache/config";
import { prisma } from "@/lib/prisma";

export type PublicDirectoryProfile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  stageName: string | null;
  avatarUrl: string | null;
  cityId: string | null;
  updatedAt: Date;
  skills: unknown;
};

export type PublicDirectoryQuery = {
  cityId?: string;
  skill?: string;
};

function buildCacheKey(params: PublicDirectoryQuery): string {
  const city = params.cityId ?? "all";
  const skill = params.skill ?? "all";
  return `${city}:${skill}`;
}

function buildTags(params: PublicDirectoryQuery): string[] {
  const tags = [CACHE_TAGS.profilesList];

  if (params.cityId) {
    tags.push(CACHE_TAGS.profilesListCity(params.cityId));
  }

  if (params.skill) {
    tags.push(CACHE_TAGS.profilesListSkill(params.skill));
  }

  return tags;
}

function logTiming(label: string, start: bigint, metadata: string) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const elapsed = Number(process.hrtime.bigint() - start) / 1_000_000;
  console.info(`${label} duration=${elapsed.toFixed(1)}ms ${metadata}`);
}

export async function getPublicDirectoryProfiles(params: PublicDirectoryQuery) {
  const normalized: PublicDirectoryQuery = {
    cityId: params.cityId?.trim() || undefined,
    skill: params.skill?.trim() || undefined,
  };
  const cacheKey = buildCacheKey(normalized);
  const tags = buildTags(normalized);

  const resolver = async () => {
    const now = new Date();

    return prisma.profile.findMany({
      where: {
        visibility: "PUBLIC",
        moderationStatus: "APPROVED",
        publishedAt: { not: null },
        user: {
          entitlements: {
            some: {
              key: CAN_PUBLISH_PROFILE,
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
          },
        },
        ...(normalized.cityId ? { cityId: normalized.cityId } : {}),
        ...(normalized.skill
          ? {
              skills: {
                array_contains: [normalized.skill],
              },
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        stageName: true,
        avatarUrl: true,
        cityId: true,
        updatedAt: true,
        skills: true,
      },
    });
  };

  if (shouldBypassCache()) {
    const start = process.hrtime.bigint();
    const result = await resolver();
    logTiming("[orch:profiles] bypass_cache", start, `key=${cacheKey}`);
    return result;
  }

  const resolve = unstable_cache(resolver, ["profiles-directory", cacheKey], {
    revalidate: CACHE_REVALIDATE.profilesList,
    tags,
  });

  const start = process.hrtime.bigint();
  const result = await resolve();
  logTiming("[orch:profiles]", start, `key=${cacheKey}`);
  return result;
}

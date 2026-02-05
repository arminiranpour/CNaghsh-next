import { SavedItemType } from "@prisma/client";

import { getServerAuthSession } from "@/lib/auth/session";
import { badRequest, getIntQuery, getQuery, ok, unauthorized } from "@/lib/http";
import { getPublicMediaUrlFromKey } from "@/lib/media/urls";
import { prisma } from "@/lib/prisma";
import { getDisplayName } from "@/lib/profile/profile-page-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

const parseType = (value: string | null): SavedItemType | null => {
  if (!value) return null;
  if (value === "MOVIE") return SavedItemType.MOVIE;
  if (value === "PROFILE") return SavedItemType.PROFILE;
  if (value === "BOOK") return SavedItemType.BOOK;
  if (value === "MONOLOGUE") return SavedItemType.MONOLOGUE;
  return null;
};

export async function GET(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return unauthorized("UNAUTHORIZED");
  }

  const typeParam = parseType(getQuery(request, "type"));
  if (!typeParam) {
    return badRequest("INVALID_TYPE");
  }

  const page = Math.max(1, getIntQuery(request, "page", { min: 1 }) ?? 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, getIntQuery(request, "pageSize", { min: 1, max: MAX_PAGE_SIZE }) ?? DEFAULT_PAGE_SIZE),
  );

  const userId = session.user.id;

  const [total, savedItems] = await prisma.$transaction([
    prisma.savedItem.count({ where: { userId, type: typeParam } }),
    prisma.savedItem.findMany({
      where: { userId, type: typeParam },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { entityId: true, createdAt: true },
    }),
  ]);

  const entityIds = savedItems.map((item) => item.entityId);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  if (typeParam === SavedItemType.MOVIE) {
    const movies = entityIds.length
      ? await prisma.movie.findMany({
          where: { id: { in: entityIds } },
          select: {
            id: true,
            titleFa: true,
            titleEn: true,
            posterCardMediaAssetId: true,
            posterCardMediaAsset: { select: { outputKey: true, visibility: true } },
          },
        })
      : [];

    const movieMap = new Map(movies.map((movie) => [movie.id, movie] as const));

    const items = savedItems
      .map((item) => {
        const movie = movieMap.get(item.entityId);
        if (!movie) return null;
        const posterUrl =
          movie.posterCardMediaAsset?.outputKey && movie.posterCardMediaAsset.visibility === "public"
            ? getPublicMediaUrlFromKey(movie.posterCardMediaAsset.outputKey)
            : null;

        return {
          id: movie.id,
          titleFa: movie.titleFa,
          titleEn: movie.titleEn,
          posterCardMediaAssetId: movie.posterCardMediaAssetId,
          posterCardPreviewUrl: posterUrl,
          savedAt: item.createdAt,
        };
      })
      .filter(Boolean);

    return ok({ items, page, pageSize, total, pageCount });
  }

  if (typeParam === SavedItemType.PROFILE) {
    const profiles = entityIds.length
      ? await prisma.profile.findMany({
          where: { id: { in: entityIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            stageName: true,
            avatarUrl: true,
          },
        })
      : [];

    const profileMap = new Map(profiles.map((profile) => [profile.id, profile] as const));

    const items = savedItems
      .map((item) => {
        const profile = profileMap.get(item.entityId);
        if (!profile) return null;
        const displayName = getDisplayName(profile.stageName, profile.firstName, profile.lastName);

        return {
          id: profile.id,
          displayName,
          avatarUrl: profile.avatarUrl ?? null,
          savedAt: item.createdAt,
        };
      })
      .filter(Boolean);

    return ok({ items, page, pageSize, total, pageCount });
  }

  return ok({ items: [], page, pageSize, total, pageCount });
}

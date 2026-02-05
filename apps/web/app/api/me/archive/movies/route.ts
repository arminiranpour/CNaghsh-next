import { SavedItemType } from "@prisma/client";

import { getServerAuthSession } from "@/lib/auth/session";
import { ok, unauthorized } from "@/lib/http";
import { getPublicMediaUrlFromKey } from "@/lib/media/urls";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type ArchivedMovieItem = {
  id: string;
  titleFa: string;
  titleEn: string;
  director: string;
  posterCardPreviewUrl: string | null;
};

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return unauthorized("UNAUTHORIZED");
  }

  const userId = session.user.id;

  const savedItems = await prisma.savedItem.findMany({
    where: { userId, type: SavedItemType.MOVIE },
    orderBy: { createdAt: "desc" },
    select: { entityId: true, createdAt: true },
  });

  const entityIds = savedItems.map((item) => item.entityId);

  const movies = entityIds.length
    ? await prisma.movie.findMany({
        where: { id: { in: entityIds } },
        select: {
          id: true,
          titleFa: true,
          titleEn: true,
          director: true,
          posterCardMediaAsset: {
            select: { outputKey: true, visibility: true },
          },
        },
      })
    : [];

  const movieMap = new Map(movies.map((movie) => [movie.id, movie] as const));

  const items = savedItems
    .map((item) => {
      const movie = movieMap.get(item.entityId);
      if (!movie) return null;

      const previewUrl =
        movie.posterCardMediaAsset?.outputKey && movie.posterCardMediaAsset.visibility === "public"
          ? getPublicMediaUrlFromKey(movie.posterCardMediaAsset.outputKey)
          : null;

      return {
        id: movie.id,
        titleFa: movie.titleFa,
        titleEn: movie.titleEn,
        director: movie.director,
        posterCardPreviewUrl: previewUrl,
      } satisfies ArchivedMovieItem;
    })
    .filter((item): item is ArchivedMovieItem => Boolean(item));

  return ok({ items });
}

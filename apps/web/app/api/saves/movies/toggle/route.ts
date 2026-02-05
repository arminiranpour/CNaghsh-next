import { SavedItemType } from "@prisma/client";

import { getServerAuthSession } from "@/lib/auth/session";
import { badRequest, ok, unauthorized, safeJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type ToggleMovieBody = {
  movieId?: string;
};

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return unauthorized("UNAUTHORIZED");
  }

  const parsed = await safeJson<ToggleMovieBody>(request);
  if (!parsed.ok) {
    return badRequest("INVALID_JSON");
  }

  const movieId = parsed.data.movieId?.trim();
  if (!movieId) {
    return badRequest("MISSING_MOVIE_ID");
  }

  const userId = session.user.id;

  const existing = await prisma.savedItem.findUnique({
    where: {
      userId_type_entityId: {
        userId,
        type: SavedItemType.MOVIE,
        entityId: movieId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.savedItem.delete({ where: { id: existing.id } });
    return ok({ saved: false });
  }

  await prisma.savedItem.create({
    data: {
      userId,
      type: SavedItemType.MOVIE,
      entityId: movieId,
    },
  });

  return ok({ saved: true });
}

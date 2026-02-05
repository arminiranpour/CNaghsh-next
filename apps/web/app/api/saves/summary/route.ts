import { SavedItemType } from "@prisma/client";

import { getServerAuthSession } from "@/lib/auth/session";
import { ok, unauthorized } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return unauthorized("UNAUTHORIZED");
  }

  const userId = session.user.id;

  const grouped = await prisma.savedItem.groupBy({
    by: ["type"],
    where: { userId },
    _count: { _all: true },
  });

  const counts = {
    profiles: 0,
    movies: 0,
    books: 0,
    monologues: 0,
  };

  for (const row of grouped) {
    switch (row.type) {
      case SavedItemType.PROFILE:
        counts.profiles = row._count._all;
        break;
      case SavedItemType.MOVIE:
        counts.movies = row._count._all;
        break;
      case SavedItemType.BOOK:
        counts.books = row._count._all;
        break;
      case SavedItemType.MONOLOGUE:
        counts.monologues = row._count._all;
        break;
      default:
        break;
    }
  }

  return ok({ counts });
}

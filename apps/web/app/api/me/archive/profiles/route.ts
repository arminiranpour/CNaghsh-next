import { SavedItemType } from "@prisma/client";

import { getServerAuthSession } from "@/lib/auth/session";
import { ok, unauthorized } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type ArchivedProfileItem = {
  id: string;
  stageName: string | null;
  firstName: string | null;
  lastName: string | null;
  age: number | null;
  avatarUrl: string | null;
};

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return unauthorized("UNAUTHORIZED");
  }

  const userId = session.user.id;

  const savedItems = await prisma.savedItem.findMany({
    where: { userId, type: SavedItemType.PROFILE },
    orderBy: { createdAt: "desc" },
    select: { entityId: true, createdAt: true },
  });

  const entityIds = savedItems.map((item) => item.entityId);

  const profiles = entityIds.length
    ? await prisma.profile.findMany({
        where: { id: { in: entityIds } },
        select: {
          id: true,
          stageName: true,
          firstName: true,
          lastName: true,
          age: true,
          avatarUrl: true,
        },
      })
    : [];

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile] as const));

  const items = savedItems
    .map((item) => {
      const profile = profileMap.get(item.entityId);
      if (!profile) return null;

      return {
        id: profile.id,
        stageName: profile.stageName,
        firstName: profile.firstName,
        lastName: profile.lastName,
        age: profile.age ?? null,
        avatarUrl: profile.avatarUrl ?? null,
      } satisfies ArchivedProfileItem;
    })
    .filter((item): item is ArchivedProfileItem => Boolean(item));

  return ok({ items });
}

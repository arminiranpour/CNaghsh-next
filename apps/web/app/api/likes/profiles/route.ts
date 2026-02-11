import { getServerAuthSession } from "@/lib/auth/session";
import { badRequest, notFound, ok, safeJson, unauthorized } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type LikeProfileBody = {
  profileId?: string;
};

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return unauthorized("UNAUTHORIZED");
  }

  const parsed = await safeJson<LikeProfileBody>(request);
  if (!parsed.ok) {
    return badRequest("INVALID_JSON");
  }

  const profileId = parsed.data.profileId?.trim();
  if (!profileId) {
    return badRequest("MISSING_PROFILE_ID");
  }

  const userId = session.user.id;

  const result = await prisma.$transaction(async (tx) => {
    const profile = await tx.profile.findUnique({
      where: { id: profileId },
      select: { id: true, userId: true, likesCount: true },
    });

    if (!profile) {
      return null;
    }

    if (profile.userId === userId) {
      return { error: "CANNOT_LIKE_OWN_PROFILE", likesCount: profile.likesCount };
    }

    const existing = await tx.profileLike.findUnique({
      where: { userId_profileId: { userId, profileId } },
      select: { id: true },
    });

    if (existing) {
      await tx.profileLike.delete({ where: { id: existing.id } });
      const nextCount = Math.max(0, profile.likesCount - 1);
      const updated = await tx.profile.update({
        where: { id: profileId },
        data: { likesCount: nextCount },
        select: { likesCount: true },
      });

      return { liked: false, likesCount: updated.likesCount };
    }

    await tx.profileLike.create({
      data: { userId, profileId },
    });

    const updated = await tx.profile.update({
      where: { id: profileId },
      data: { likesCount: { increment: 1 } },
      select: { likesCount: true },
    });

    return { liked: true, likesCount: updated.likesCount };
  });

  if (!result) {
    return notFound("PROFILE_NOT_FOUND");
  }

  if ("error" in result) {
    return badRequest(result.error);
  }

  return ok(result);
}

import { NextRequest, NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth/session";
import { NO_STORE_HEADERS } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type RouteContext = {
  params: { mediaId: string };
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }
  const mediaId = context.params.mediaId;
  if (!mediaId) {
    return NextResponse.json(
      { error: "NOT_FOUND" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }
  const media = await prisma.mediaAsset.findUnique({
    where: { id: mediaId },
  });
  if (!media || media.ownerUserId !== session.user.id) {
    return NextResponse.json(
      { error: "NOT_FOUND" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }
  return NextResponse.json(
    {
      ok: true,
      mediaId: media.id,
      status: media.status,
      visibility: media.visibility,
      errorMessage: media.errorMessage ?? null,
      durationSec: media.durationSec ?? null,
      width: media.width ?? null,
      height: media.height ?? null,
      sizeBytes: media.sizeBytes ? Number(media.sizeBytes) : null,
    },
    { headers: NO_STORE_HEADERS },
  );
}

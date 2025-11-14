import { NextRequest, NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth/session";
import { NO_STORE_HEADERS } from "@/lib/http";
import { buildPublicMediaUrlFromKey } from "@/lib/media/urls";
import { prisma } from "@/lib/prisma";
import { getSignedGetUrl } from "@/lib/storage/signing";
import { resolveBucketForVisibility } from "@/lib/storage/visibility";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type RouteContext = {
  params: { mediaId: string };
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const mediaId = context.params.mediaId;
  if (!mediaId) {
    return NextResponse.json(
      { error: "NOT_FOUND" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }
  const media = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
  if (!media || media.status !== "ready" || media.type !== "video" || !media.outputKey) {
    return NextResponse.json(
      { error: "NOT_FOUND" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }
  if (media.visibility === "public") {
    const manifestUrl = buildPublicMediaUrlFromKey(media.outputKey);
    return NextResponse.json(
      { ok: true, url: manifestUrl },
      { headers: NO_STORE_HEADERS },
    );
  }
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }
  if (session.user.id !== media.ownerUserId) {
    return NextResponse.json(
      { error: "FORBIDDEN" },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }
  const bucket = resolveBucketForVisibility(media.visibility);
  const signedUrl = await getSignedGetUrl(bucket, media.outputKey);
  return NextResponse.json(
    { ok: true, url: signedUrl },
    { headers: NO_STORE_HEADERS },
  );
}

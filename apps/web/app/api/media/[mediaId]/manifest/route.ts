import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth/session";
import { NO_STORE_HEADERS, PRIVATE_SHORT_CACHE_HEADERS } from "@/lib/http";
import { logError, logInfo } from "@/lib/logging";
import { getPublicMediaUrlFromKey } from "@/lib/media/urls";
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
    logInfo("media.manifest.fetch", { result: "missing_media_id" });
    return NextResponse.json(
      { error: "NOT_FOUND" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }
  try {
    const media = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
    if (!media || media.status !== "ready" || media.type !== "video" || !media.outputKey) {
      logInfo("media.manifest.fetch", { mediaId, result: "not_found" });
      return NextResponse.json(
        { error: "NOT_FOUND" },
        { status: 404, headers: NO_STORE_HEADERS },
      );
    }
    if (media.visibility === "public") {
      const manifestUrl = getPublicMediaUrlFromKey(media.outputKey);
      const posterUrl = media.posterKey ? getPublicMediaUrlFromKey(media.posterKey) : null;
      console.log("[debug] manifestUrl =", manifestUrl);
      console.log("[debug] posterUrl =", posterUrl);
      logInfo("media.manifest.fetch", {
        mediaId,
        result: "ok",
        visibility: media.visibility,
        mode: "public",
        manifestUrl,
        posterUrl,
      });
      return NextResponse.json(
        {
          ok: true,
          mode: "public",
          manifestUrl,
          posterUrl,
          url: manifestUrl,
        },
        { headers: PRIVATE_SHORT_CACHE_HEADERS },
      );
    }
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      logInfo("media.manifest.fetch", { mediaId, result: "unauthorized" });
      return NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401, headers: NO_STORE_HEADERS },
      );
    }
    if (session.user.id !== media.ownerUserId) {
      logInfo("media.manifest.fetch", { mediaId, userId: session.user.id, result: "forbidden" });
      return NextResponse.json(
        { error: "FORBIDDEN" },
        { status: 403, headers: NO_STORE_HEADERS },
      );
    }
    const bucket = resolveBucketForVisibility("public");
    const [signedUrl, posterUrl] = await Promise.all([
      getSignedGetUrl(bucket, media.outputKey),
      media.posterKey ? getSignedGetUrl(bucket, media.posterKey) : Promise.resolve<string | null>(null),
    ]);
    logInfo("media.manifest.fetch", {
      mediaId,
      userId: session.user.id,
      result: "ok",
      visibility: media.visibility,
      mode: "signed",
      manifestUrl: signedUrl,
      posterUrl,
    });
    return NextResponse.json(
      {
        ok: true,
        mode: "signed",
        manifestUrl: signedUrl,
        posterUrl,
        url: signedUrl,
      },
      { headers: PRIVATE_SHORT_CACHE_HEADERS },
    );
  } catch (error) {
    Sentry.captureException(error);
    logError("media.manifest.fetch", {
      mediaId,
      result: "error",
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "ERROR" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

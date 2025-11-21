import "../storage/env-loader";

import { PrismaClient } from "@prisma/client";

import type { MediaCdnConfig } from "../../lib/media/cdn-config.ts";
import * as mediaCdnConfigModule from "../../lib/media/cdn-config.ts";
import * as mediaUrls from "../../lib/media/urls.ts";

const mediaCdnConfig: MediaCdnConfig = (() => {
  const config =
    (mediaCdnConfigModule as Partial<{ mediaCdnConfig: MediaCdnConfig }>)
      .mediaCdnConfig ??
    (mediaCdnConfigModule as Partial<{ default: MediaCdnConfig }>).default;

  if (!config) {
    throw new Error(
      "mediaCdnConfig export missing from ../../lib/media/cdn-config",
    );
  }

  return config;
})();

const getPlaybackInfoForMedia: typeof mediaUrls.getPlaybackInfoForMedia =
  (mediaUrls as any).getPlaybackInfoForMedia ??
  (mediaUrls as any).default?.getPlaybackInfoForMedia;

if (typeof getPlaybackInfoForMedia !== "function") {
  throw new Error(
    `getPlaybackInfoForMedia not found on mediaUrls module. Exports: ${Object.keys(
      mediaUrls as Record<string, unknown>,
    ).join(", ")}`,
  );
}
const prisma = new PrismaClient();

async function run() {
  const media = await prisma.mediaAsset.findFirst({
    where: {
      status: "ready",
      type: "video",
      outputKey: { not: null },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!media) {
    console.log("No ready media asset found.");
    return;
  }
  const playback = getPlaybackInfoForMedia(media);
  console.log(`Media ${media.id} visibility=${media.visibility} kind=${playback.kind}`);
  console.log(`Manifest URL: ${playback.manifestUrl}`);
  if (playback.posterUrl) {
    console.log(`Poster URL: ${playback.posterUrl}`);
  }
  if (media.visibility === "public") {
    if (!playback.manifestUrl.startsWith(mediaCdnConfig.cdnBaseUrl)) {
      throw new Error("Public manifest URL must use the CDN base URL");
    }
    if (playback.posterUrl && !playback.posterUrl.startsWith(mediaCdnConfig.cdnBaseUrl)) {
      throw new Error("Public poster URL must use the CDN base URL");
    }
  } else {
    if (playback.kind !== "private-proxy") {
      throw new Error("Private media must resolve through proxy playback");
    }
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

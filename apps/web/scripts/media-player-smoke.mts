import { PrismaClient } from "@prisma/client";
import * as mediaUrls from "../lib/media/urls";

const prisma = new PrismaClient();

const getPlaybackInfoForMedia: any =
  (mediaUrls as any).getPlaybackInfoForMedia ??
  (mediaUrls as any).default?.getPlaybackInfoForMedia;

async function run() {
  console.log("mediaUrls exports:", Object.keys(mediaUrls));

  if (typeof getPlaybackInfoForMedia !== "function") {
    console.log("⚠️ getPlaybackInfoForMedia not found on mediaUrls, exports were:", Object.keys(mediaUrls));
    return;
  }

  const media = await prisma.mediaAsset.findFirst({
    where: {
      status: "ready",
      type: "video",
      outputKey: { not: null },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!media) {
    console.log("هیچ ویدیوی آماده‌ای یافت نشد.");
    return;
  }

  const playback = getPlaybackInfoForMedia(media);

  console.log(`mediaId=${media.id} visibility=${media.visibility} kind=${playback.kind}`);
  console.log(`manifest=${playback.manifestUrl}`);
  if (playback.posterUrl) {
    console.log(`poster=${playback.posterUrl}`);
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

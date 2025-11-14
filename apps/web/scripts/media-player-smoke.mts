import { prisma } from "../lib/prisma";
import { getPlaybackInfoForMedia } from "../lib/media/urls";

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

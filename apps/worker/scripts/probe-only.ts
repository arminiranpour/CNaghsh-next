import { extname } from "node:path";

import { MediaType } from "@prisma/client";

import { logger } from "../src/lib/logger";
import { prisma } from "../src/lib/prisma";
import { cleanupPath, createTempFile } from "../src/lib/tmp";
import { probeMedia } from "../src/services/ffprobe";
import { storageConfig } from "../src/storage/config";
import { downloadToFile } from "../src/storage/io";

const resolveMediaId = () => {
  const fromEnv = process.env.MEDIA_ID?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  const fromArg = process.argv[2]?.trim();
  if (fromArg && fromArg.length > 0) {
    return fromArg;
  }
  return null;
};

const safeCleanup = async (path: string | null) => {
  if (!path) {
    return;
  }
  try {
    await cleanupPath(path);
  } catch (error) {
    logger.warn("script", "Failed to cleanup temporary file", {
      path,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

const main = async () => {
  const mediaId = resolveMediaId();
  if (!mediaId) {
    throw new Error("MEDIA_ID is required via environment variable or CLI argument");
  }

  const media = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
  if (!media) {
    throw new Error(`Media asset ${mediaId} not found`);
  }
  if (media.type !== MediaType.video) {
    throw new Error(`Media asset ${mediaId} is not a video`);
  }

  let tempPath: string | null = null;
  try {
    const sourceExt = extname(media.sourceKey) || ".mp4";
    tempPath = await createTempFile("media-probe", sourceExt);
    await downloadToFile(storageConfig.privateBucket, media.sourceKey, tempPath);
    const metadata = await probeMedia(tempPath);
    logger.info("script", "Probe metadata", { mediaAssetId: mediaId, metadata });
  } finally {
    await safeCleanup(tempPath);
  }
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    logger.error("script", "Failed to probe media asset", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    await prisma.$disconnect().catch(() => {});
    process.exitCode = 1;
  });

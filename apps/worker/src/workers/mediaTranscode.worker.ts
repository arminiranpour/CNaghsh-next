import { basename, extname } from "node:path";
import { stat } from "node:fs/promises";

import type { Job } from "bullmq";
import { Worker } from "bullmq";
import { MediaStatus, MediaType, Prisma, PrismaClient, TranscodeJobStatus } from "@prisma/client";

import { config } from "../config";
import { transcodeConfig } from "../config.transcode";
import { logError, logInfo, logWarn } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { createWorkerConnection } from "../lib/queue-connection";
import { cleanupPath, createTempDir, createTempFile } from "../lib/tmp";
import { MEDIA_TRANSCODE_QUEUE_NAME } from "../queues/mediaTranscode.constants";
import type { MediaTranscodeJobData } from "../queues/mediaTranscode.types";
import { probeMedia } from "../services/ffprobe";
import { transcodeToHls } from "../services/hls-transcode";
import { generatePoster } from "../services/poster";
import { storageConfig } from "../storage/config";
import { cacheHlsManifest, cacheHlsSegment, cachePoster } from "../storage/headers";
import { downloadToFile, uploadFile } from "../storage/io";
import { getHlsManifestKey, getHlsVariantPrefix, getPosterKey, joinKey } from "../storage/keys";
import { resolveBucketForVisibility } from "../storage/visibility";
import { captureWorkerException } from "../sentry";

type MediaTranscodeJobResult = { mediaAssetId: string; attempt: number };

const calculateBackoff = (attemptsMade: number) => {
  if (attemptsMade <= 1) {
    return config.MEDIA_TRANSCODE_BACKOFF_MS;
  }
  return config.MEDIA_TRANSCODE_BACKOFF_MS * Math.pow(2, attemptsMade - 1);
};

const safeCleanup = async (path: string | null, label: string) => {
  if (!path) {
    return;
  }
  try {
    await cleanupPath(path);
  } catch (error) {
    logWarn("media.transcode.cleanup_failure", {
      path,
      label,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

const processJob = async (job: Job<MediaTranscodeJobData>): Promise<MediaTranscodeJobResult> => {
  const mediaAssetId = job.data?.mediaAssetId;
  const attempt = job.data?.attempt ?? 1;
  if (!mediaAssetId) {
    throw new Error("Missing mediaAssetId");
  }
  logInfo("media.transcode.start", {
    queue: MEDIA_TRANSCODE_QUEUE_NAME,
    jobId: job.id,
    mediaAssetId,
    attempt,
    retryCount: job.attemptsMade,
  });

  const variants = transcodeConfig.variants;
  const segmentDurationSec = transcodeConfig.segmentDurationSec;

  let media = await prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } });
  if (!media) {
    throw new Error(`Media asset ${mediaAssetId} not found`);
  }
  if (media.type !== MediaType.video) {
    throw new Error(`Unsupported media type ${media.type}`);
  }

  let transcodeJobRecord = await prisma.transcodeJob.findFirst({
    where: { mediaAssetId, attempt },
    orderBy: { createdAt: "desc" },
  });

  if (media.status === MediaStatus.ready && media.outputKey) {
    if (transcodeJobRecord && transcodeJobRecord.status !== TranscodeJobStatus.done) {
      const finishedAt = new Date();
      await prisma.transcodeJob.update({
        where: { id: transcodeJobRecord.id },
        data: {
          status: TranscodeJobStatus.done,
          startedAt: transcodeJobRecord.startedAt ?? finishedAt,
          finishedAt,
          logs: {
            skipped: true,
            reason: "already-ready",
          },
        },
      });
    }
    logInfo("media.transcode.skip", {
      mediaAssetId,
      jobId: job.id,
    });
    return { mediaAssetId, attempt };
  }

  const startTime = new Date();
  const transactionResult = await prisma.$transaction(async (tx: PrismaClient) => {
    let activeJob = transcodeJobRecord;
    if (activeJob) {
      activeJob = await tx.transcodeJob.update({
        where: { id: activeJob.id },
        data: {
          attempt,
          status: TranscodeJobStatus.processing,
          startedAt: startTime,
          finishedAt: null,
        },
      });
    } else {
      activeJob = await tx.transcodeJob.create({
        data: {
          mediaAssetId,
          attempt,
          status: TranscodeJobStatus.processing,
          startedAt: startTime,
        },
      });
    }
    const updatedMedia = await tx.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        status: MediaStatus.processing,
        errorMessage: null,
      },
    });
    return { activeJob, updatedMedia };
  });

  transcodeJobRecord = transactionResult.activeJob;
  media = transactionResult.updatedMedia;

  const sourceExt = extname(media.sourceKey);
  let sourcePath: string | null = null;
  let outputDir: string | null = null;
  let posterPath: string | null = null;

  try {
    sourcePath = await createTempFile("media-source", sourceExt);
    const originalsBucket = storageConfig.privateBucket;
    logInfo("media.transcode.download.start", {
      mediaAssetId,
      bucket: originalsBucket,
      key: media.sourceKey,
    });
    try {
      await downloadToFile(originalsBucket, media.sourceKey, sourcePath);
    } catch (error) {
      logError("media.transcode.download.failure", {
        mediaAssetId,
        bucket: originalsBucket,
        key: media.sourceKey,
        message: error instanceof Error ? error.message : "unknown",
      });
      throw error;
    }
    const sourceStats = await stat(sourcePath);

    const metadata = await probeMedia(sourcePath);

    outputDir = await createTempDir("media-hls");
    const hlsResult = await transcodeToHls(
      sourcePath,
      outputDir,
      transcodeConfig.playlistName,
      variants,
      segmentDurationSec,
    );

    if (hlsResult.variantOutputs.length !== variants.length) {
      throw new Error("Variant outputs mismatch");
    }

    posterPath = await createTempFile("media-poster", ".jpg");
    await generatePoster(sourcePath, posterPath, metadata.durationSec, transcodeConfig.posterTimeFraction);

    const manifestKey = getHlsManifestKey(media.id);
    const posterKey = getPosterKey(media.id);
    const outputBucket = resolveBucketForVisibility(media.visibility);

    const manifestStat = await stat(hlsResult.manifestPath);
    await uploadFile(
      {
        bucket: outputBucket,
        key: manifestKey,
        contentType: "application/vnd.apple.mpegurl",
        cacheControl: cacheHlsManifest(),
      },
      hlsResult.manifestPath,
    );

    let totalOutputBytes = manifestStat.size;
    const variantSummaries: Array<{
      name: string;
      width: number;
      height: number;
      videoBitrateKbps: number;
      audioBitrateKbps: number;
      playlistBytes: number;
      segmentCount: number;
      segmentBytes: number;
    }> = [];

    for (let index = 0; index < variants.length; index += 1) {
      const variantConfig = variants[index];
      const variantOutput = hlsResult.variantOutputs[index];
      const variantPrefix = getHlsVariantPrefix(media.id, variantOutput.name);
      const variantPlaylistKey = joinKey(variantPrefix, "index.m3u8");
      const playlistStat = await stat(variantOutput.playlistPath);
      await uploadFile(
        {
          bucket: outputBucket,
          key: variantPlaylistKey,
          contentType: "application/vnd.apple.mpegurl",
          cacheControl: cacheHlsManifest(),
        },
        variantOutput.playlistPath,
      );
      totalOutputBytes += playlistStat.size;

      let variantSegmentBytes = 0;
      for (const segmentPath of variantOutput.segmentPaths) {
        const segmentName = basename(segmentPath);
        const segmentKey = joinKey(variantPrefix, segmentName);
        const segmentStat = await stat(segmentPath);
        await uploadFile(
          {
            bucket: outputBucket,
            key: segmentKey,
            contentType: "video/mp2t",
            cacheControl: cacheHlsSegment(),
          },
          segmentPath,
        );
        variantSegmentBytes += segmentStat.size;
      }
      totalOutputBytes += variantSegmentBytes;
      variantSummaries.push({
        name: variantConfig.name,
        width: variantConfig.width,
        height: variantConfig.height,
        videoBitrateKbps: variantConfig.videoBitrateKbps,
        audioBitrateKbps: variantConfig.audioBitrateKbps,
        playlistBytes: playlistStat.size,
        segmentCount: variantOutput.segmentPaths.length,
        segmentBytes: variantSegmentBytes,
      });
    }

    const posterStat = await stat(posterPath);
    await uploadFile(
      {
        bucket: outputBucket,
        key: posterKey,
        contentType: "image/jpeg",
        cacheControl: cachePoster(),
      },
      posterPath,
    );
    totalOutputBytes += posterStat.size;

    const durationSec = Math.max(Math.round(metadata.durationSec), 1);
    const width = Math.max(Math.round(metadata.width), 1);
    const height = Math.max(Math.round(metadata.height), 1);
    const bitrate = metadata.bitrateKbps ? Math.max(Math.round(metadata.bitrateKbps), 1) : null;

    const finishedAt = new Date();
    await prisma.$transaction(async (tx: PrismaClient) => {
      await tx.mediaAsset.update({
        where: { id: mediaAssetId },
        data: {
          status: MediaStatus.ready,
          outputKey: manifestKey,
          posterKey,
          durationSec,
          width,
          height,
          codec: metadata.videoCodec,
          bitrate,
          errorMessage: null,
        },
      });
      await tx.transcodeJob.update({
        where: { id: transcodeJobRecord.id },
        data: {
          status: TranscodeJobStatus.done,
          finishedAt,
          logs: {
            ffprobe: metadata,
            variants: variantSummaries,
            manifestKey,
            posterKey,
            totalOutputBytes,
            sourceBytes: sourceStats.size,
            attempt,
          },
        },
      });
    });

    logInfo("media.transcode.success", {
      mediaAssetId,
      jobId: job.id,
      manifestKey,
      posterKey,
    });

    return { mediaAssetId, attempt };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const safeMessage = message.length > 500 ? `${message.slice(0, 497)}...` : message;
    const failureLog: Prisma.JsonObject =
      error instanceof Error && error.stack
        ? { error: safeMessage, attempt, stack: error.stack }
        : { error: safeMessage, attempt };
    const finishedAt = new Date();
    try {
      if (transcodeJobRecord) {
        await prisma.transcodeJob.update({
          where: { id: transcodeJobRecord.id },
          data: {
            status: TranscodeJobStatus.failed,
            finishedAt,
            logs: failureLog,
          },
        });
      }
      await prisma.mediaAsset.update({
        where: { id: mediaAssetId },
        data: {
          status: MediaStatus.failed,
          errorMessage: safeMessage,
        },
      });
    } catch (updateError) {
      logError("media.transcode.failure_persist", {
        mediaAssetId,
        message: updateError instanceof Error ? updateError.message : String(updateError),
      });
    }
    logError("media.transcode.failure", {
      mediaAssetId,
      jobId: job.id,
      message: safeMessage,
    });
    captureWorkerException(error);
    throw error;
  } finally {
    await safeCleanup(posterPath, "poster");
    await safeCleanup(outputDir, "hls-output");
    await safeCleanup(sourcePath, "source");
  }
};

export const mediaTranscodeWorker = new Worker<MediaTranscodeJobData, MediaTranscodeJobResult>(
  MEDIA_TRANSCODE_QUEUE_NAME,
  processJob,
  {
    connection: createWorkerConnection(),
    concurrency: config.MEDIA_TRANSCODE_CONCURRENCY,
    settings: {
      backoffStrategy: (attemptsMade: number) => calculateBackoff(attemptsMade),
    },
  },
);

mediaTranscodeWorker.on("completed", (job: Job<MediaTranscodeJobData, MediaTranscodeJobResult>) => {
  const result = job.returnvalue;
  logInfo("media.transcode.worker.completed", {
    queue: MEDIA_TRANSCODE_QUEUE_NAME,
    jobId: job.id,
    returnvalue: result,
  });
});

mediaTranscodeWorker.on("failed", (job: Job<MediaTranscodeJobData>, error: unknown) => {
  const normalizedError = error instanceof Error ? error : new Error(String(error));
  logError("media.transcode.worker.failed", {
    queue: MEDIA_TRANSCODE_QUEUE_NAME,
    jobId: job?.id,
    failedReason: normalizedError.message,
    stack: normalizedError.stack,
    attemptsMade: job?.attemptsMade,
  });
});

mediaTranscodeWorker.on("error", (error: unknown) => {
  const normalizedError = error instanceof Error ? error : new Error(String(error));
  logError("media.transcode.worker.error", {
    message: normalizedError.message,
    stack: normalizedError.stack,
  });
});

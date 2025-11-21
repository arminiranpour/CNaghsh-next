# Phase 5 – Transcode Pipeline

## Overview
The media worker now performs real FFmpeg processing for queued video assets. Each job downloads the original from the private bucket, probes it for metadata, generates multi-bitrate HLS outputs plus a poster image, uploads the derived files back to S3, and updates the database state.

## Inputs
- `MediaAsset` row with `status` `uploaded` or `processing`, `sourceKey`, and `visibility`.
- Corresponding `TranscodeJob` row with `status` `queued`.
- Job payload on the `media.transcode` BullMQ queue: `{ mediaAssetId, attempt }`.

## Processing Steps
1. Load the asset and job from Prisma. Skip if the asset is already `ready` with an `outputKey`.
2. Transition the job to `processing` and mark the media asset as `processing`.
3. Download the original video from the private bucket to a temporary file.
4. Run `ffprobe` to collect duration, dimensions, codecs, and bitrate. Abort if the probe is invalid.
5. Transcode the video to HLS using FFmpeg:
   - Variants defined by `HLS_VARIANTS` env (defaults: 240p/480p/720p).
   - Segment duration from `HLS_SEGMENT_DURATION_SEC` (default 6 seconds).
   - Generates variant playlists under `v{name}/index.m3u8` and MPEG-TS segments.
6. Generate a poster JPEG at the configured fraction of the video duration (`HLS_POSTER_TIME_FRACTION`, default 0.5).
7. Upload outputs to S3:
   - Manifest: `processed/hls/{mediaId}/index.m3u8` (cache-control `public, max-age=120`).
   - Variant playlists: `processed/hls/{mediaId}/v{name}/index.m3u8`.
   - Segments: `processed/hls/{mediaId}/v{name}/segment_*.ts` (cache-control `public, max-age=31536000, immutable`).
   - Poster: `processed/posters/{mediaId}.jpg` (cache-control `public, max-age=31536000, immutable`).
   - Visibility determines bucket selection via `resolveBucketForVisibility` (currently both default to the private bucket in dev).
8. Update Prisma records inside a transaction:
   - `MediaAsset`: status `ready`, set `outputKey`, `posterKey`, metadata fields, clear `errorMessage`.
   - `TranscodeJob`: status `done`, `finishedAt`, and structured logs with probe data, variant byte counts, output keys, and totals.
9. Remove temporary files/directories.

On error, the worker updates `MediaAsset.status` to `failed`, stores a safe error message, marks the job `failed`, writes failure logs, and rethrows so BullMQ can retry.

## S3 Layout
```
processed/hls/{mediaId}/index.m3u8
processed/hls/{mediaId}/v{name}/index.m3u8
processed/hls/{mediaId}/v{name}/segment_00000.ts
processed/posters/{mediaId}.jpg
```

## Running the Pipeline Locally
1. Start infrastructure:
   ```bash
   docker compose -f infra/docker-compose.dev.yml up -d
   ```
2. Start the worker:
   ```bash
   pnpm --filter apps/worker dev
   ```
3. Upload a video via the web app (existing script):
   ```bash
   pnpm --filter @app/web dev
   pnpm --filter @app/web tsx apps/web/scripts/upload/init-signed-put.ts
   ```
   Copy the printed `mediaId`.
4. Trigger transcoding for that asset:
   ```bash
   MEDIA_ID=<media-id> pnpm --filter apps/worker transcode:media
   ```
5. Observe worker logs for progress (download, probe, HLS, poster, uploads, DB updates).
6. Verify database state (e.g., via Prisma studio or direct query) and call the status endpoint:
   ```bash
   curl http://localhost:3000/api/media/<media-id>/status
   ```
   Expect `status: "ready"`, populated metadata, and null `errorMessage`.

## Failure & Retries
- Any thrown error updates the job and media rows to `failed` with a concise message.
- BullMQ retries use exponential backoff controlled by `MEDIA_TRANSCODE_BACKOFF_MS` and `MEDIA_TRANSCODE_MAX_ATTEMPTS`.
- The worker is idempotent: if a job runs for an asset already marked `ready`, it skips processing and marks the job as complete.
- Re-running `transcode:media` creates a new `TranscodeJob` record with an incremented attempt and enqueues another job.

## Diagnostics
- Detailed success metadata is stored in `TranscodeJob.logs`.
- Failure diagnostics capture the error message (and stack in logs).
- Temporary files live under the OS temp directory and are cleaned up after each job.
- Additional tooling:
  - `pnpm --filter apps/worker probe:media` downloads and probes an original without transcoding.
  - `pnpm --filter apps/worker queue:drain` clears the BullMQ queue if needed.

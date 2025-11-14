# Phase 4 Queue and Worker Scaffold

## Queue Overview
- **Queue name:** `media.transcode`
- **Job payload:** `{ mediaAssetId: string; attempt: number }`
- **Retry policy:** Exponential backoff with a base delay defined by `MEDIA_TRANSCODE_BACKOFF_MS` and a retry cap from `MEDIA_TRANSCODE_MAX_ATTEMPTS`.

## Environment Variables
Set the following values in `.env.local` (and `.env.example` for onboarding):

```
REDIS_URL="redis://127.0.0.1:6379"
MEDIA_TRANSCODE_CONCURRENCY=2
MEDIA_TRANSCODE_BACKOFF_MS=30000
MEDIA_TRANSCODE_MAX_ATTEMPTS=5
```

## Running the Worker
```
pnpm --filter apps/worker dev
```
This boots the media transcode worker, attaches queue event listeners, and logs structured status messages.

## Enqueue a Sample Job
```
pnpm --filter apps/worker tsx apps/worker/scripts/enqueue-sample-video.ts
```
A sample job is added to the `media.transcode` queue and processed by the worker. Watch the worker logs for processing output.

## Clearing the Queue
```
pnpm --filter apps/worker tsx apps/worker/scripts/queue-drain.ts
```
This drains the queue and removes completed or failed jobs for a clean state.

## End-to-End Flow from the Web App
1. Start infrastructure services: `docker compose -f infra/docker-compose.dev.yml up -d`
2. Run the worker: `pnpm --filter apps/worker dev`
3. Start the web app: `pnpm --filter @app/web dev`
4. Trigger the upload init script: `pnpm --filter @app/web tsx apps/web/scripts/upload/init-signed-put.ts`

Jobs enqueued through `enqueueTranscode` use the same queue name and payload shape as the worker. Keep both sides in sync with the shared contract in `packages/contracts/src/queues/mediaTranscode.ts`.

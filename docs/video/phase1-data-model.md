# Phase 1 – Media Pipeline Data Model

## Enums
- `MediaType`: `image`, `video`
- `MediaStatus`: `uploaded`, `processing`, `ready`, `failed`
- `MediaVisibility`: `public`, `private`
- `TranscodeJobStatus`: `queued`, `processing`, `done`, `failed`

## Models
### `MediaAsset`
Tracks every uploaded media file and its derived outputs.
- Ownership: `ownerUserId` FK → `User.id`
- Lifecycle: `type`, `status`, `visibility`, and `errorMessage`
- Storage: `sourceKey`, `outputKey` (HLS), `posterKey` (preview image)
- Technical metadata: `durationSec`, `width`, `height`, `codec`, `bitrate`, `sizeBytes`
- Audit: `createdAt`, `updatedAt`
- Relations: `transcodeJobs` history

### `TranscodeJob`
Captures each processing attempt for a media asset.
- Foreign key `mediaAssetId` → `MediaAsset.id`
- Attempt metadata: `attempt`, `status`, `startedAt`, `finishedAt`
- Diagnostics: `logs`
- Audit: `createdAt`

## Storage Keys
- `sourceKey`: original upload (e.g. `uploads/originals/{userId}/seed-video.mp4`)
- `outputKey`: HLS manifest destination (set when ready)
- `posterKey`: generated poster/thumbnail (set when ready)

## Index Strategy
- `MediaAsset`
  - `@@index([ownerUserId, type, status])` to support owner dashboards and admin filters.
  - `@@index([createdAt])` for recent uploads queries.
  - `@unique(outputKey)` prevents duplicate published HLS manifests.
- `TranscodeJob`
  - `@@index([mediaAssetId, createdAt])` to quickly load processing history.
  - `@@index([status])` for worker monitoring/queues.

## ERD
- Mermaid diagram: `docs/erd/sprint7-phase1-media.md`

## Migration & Verification
Run the commands after syncing dependencies:
1. `pnpm --filter @app/web prisma migrate dev -n sprint7_video_pipeline`
2. `pnpm --filter @app/web prisma generate`
3. `pnpm --filter @app/web prisma db seed`
4. `pnpm --filter @app/web tsx scripts/checks/media-check.ts`

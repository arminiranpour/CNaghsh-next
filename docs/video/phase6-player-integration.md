# Phase 6 – Player Integration Smoke Guide

## Prerequisites
- Media worker and web app running (`docker compose -f infra/docker-compose.dev.yml up -d`, `pnpm --filter apps/worker dev`, `pnpm --filter @app/web dev`).
- A user account with access to upload media.

## Prepare a Ready Video Asset
1. Use the phase 3 upload flow or the existing upload scripts to push a test video for the target user.
2. Wait for the worker to finish transcoding. Poll `/api/media/{mediaId}/status` or run `pnpm --filter @app/web tsx scripts/upload/status-check.ts` until the asset reports `status=ready` and `outputKey` is populated.
3. Optional sanity check: `pnpm --filter @app/web tsx scripts/media-player-smoke.mts` prints the latest ready asset along with the manifest and poster URLs.

## Verify Profile Playback
1. Attach the ready media to the desired profile (or ensure the owner user has at least one public, ready video asset).
2. Visit `/profiles/{profileId}` in Chrome.
3. Scroll to the “ویدیو معرفی” section and wait for the player to enter the viewport.
4. Confirm:
   - Poster image renders before playback (if available).
   - HLS streams via hls.js (play/pause, mute, fullscreen controls respond).
   - Error overlay remains hidden.
5. Repeat in Safari (or iOS) to validate native HLS playback without hls.js.

## Verify Job Playback
1. Link the same ready media (or another public ready asset) to a published job owned by the user.
2. Visit `/jobs/{jobId}`.
3. Ensure the video card appears above the job details and the player behaves identically to the profile page checks.

## Expected Results
- Public videos stream directly from the configured CDN/S3 endpoint.
- Private videos requested via `/api/media/{mediaId}/manifest` return `{ ok: true, url: <signed> }` only for authorized users; unauthorized requests receive 401/403.
- The UI displays “پخش ویدیو ممکن نیست.” if the manifest cannot be resolved.

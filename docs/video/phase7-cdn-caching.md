# Phase 7: CDN and caching

## Architecture overview

The browser resolves media URLs through a CDN tier before requests reach object storage. Public playback requests flow as `Browser → CDN → S3/MinIO`. Private playback still begins at the application layer: `Browser → Next.js /api/media/... → signed URL → CDN → S3/MinIO`.

## Asset cache matrix

| Asset type | Example key/path | Cache-Control | Visibility | URL source |
| --- | --- | --- | --- | --- |
| HLS segment | `processed/hls/{mediaId}/v720p_000.ts` | `public, max-age=31536000, immutable` | Public | `MEDIA_CDN_BASE_URL` |
| Master manifest | `processed/hls/{mediaId}/index.m3u8` | `public, max-age=120` | Public or private | CDN URL or signed URL |
| Variant manifest | `processed/hls/{mediaId}/v720p.m3u8` | `public, max-age=120` | Public or private | CDN URL or signed URL |
| Poster | `processed/posters/{mediaId}.jpg` | `public, max-age=31536000, immutable` | Public or private | CDN URL or signed URL |
| Original upload | `uploads/originals/{userId}/{mediaId}.mp4` | `private, max-age=0, no-store` | Private | Direct origin access |

### Example URLs

- Public HLS manifest: `https://cdn.example.com/processed/hls/{mediaId}/index.m3u8`
- Private HLS manifest flow: `GET /api/media/{mediaId}/manifest → { ok: true, url: "https://cdn.example.com/processed/hls/{mediaId}/index.m3u8?X-Amz-SignedHeaders=..." }`

## Development setup

1. Start shared services: `docker compose -f infra/docker-compose.dev.yml up -d`.
2. Seed media using the upload and transcode scripts from earlier phases until a `MediaAsset` reaches `status="ready"`.
3. Run the dev CDN proxy:
   - `pnpm --filter @app/web tsx infra/cdn/dev-media-proxy.mts`
   - The proxy listens on `http://localhost:4000/media` and forwards to `MEDIA_ORIGIN_BASE_URL` while preserving cache headers and range requests.
4. Configure environment variables in `apps/web/.env.local` (and worker env) to include:
   - `MEDIA_CDN_BASE_URL` (e.g. `http://localhost:4000/media`)
   - `MEDIA_ORIGIN_BASE_URL` (e.g. `http://localhost:9000/media-public`)
   - `MEDIA_CDN_SIGNED` (`0` for unsigned, `1` for signed URLs)
   - Optional cache overrides: `HLS_SEGMENT_MAX_AGE_SEC`, `HLS_MANIFEST_MAX_AGE_SEC`, `POSTER_MAX_AGE_SEC`
5. Start the web app: `pnpm --filter @app/web dev`.
6. Verify URL wiring: `pnpm --filter @app/web media:cdn-url-check` logs CDN URLs for public assets and validates proxy routing for private assets.
7. Inspect network requests in the browser DevTools to confirm:
   - HLS manifests and segments load from `MEDIA_CDN_BASE_URL`.
   - Cache-Control headers match the matrix above.
   - Range requests for segments return `206 Partial Content` when applicable.

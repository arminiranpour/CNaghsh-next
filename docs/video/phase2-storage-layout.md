# Phase 2 storage layout

## Bucket routing

Media assets live in two logical buckets that can point to the same physical MinIO bucket in development:

- `public` visibility → `S3_PUBLIC_BUCKET`
- `private` visibility → `S3_PRIVATE_BUCKET`

`resolveBucketForVisibility` centralizes this mapping so the web app and workers make identical decisions.

## Object key layout

| Asset | Key pattern |
| --- | --- |
| Original upload | `uploads/originals/{ownerUserId}/{mediaId}.{ext}` |
| HLS manifest | `processed/hls/{mediaId}/index.m3u8` |
| HLS segment | `processed/hls/{mediaId}/v{variant}/{segmentName}` |
| Poster frame | `processed/posters/{mediaId}.jpg` |

All builders are pure functions in `apps/web/lib/storage/keys.ts`, ensuring deterministic storage locations.

## Cache-Control policy

| Asset | Cache-Control |
| --- | --- |
| Originals | `private, max-age=0, no-store` |
| HLS manifest | `public, max-age=120` |
| HLS segments | `public, max-age=31536000, immutable` |
| Posters | `public, max-age=31536000, immutable` |

Helpers in `apps/web/lib/storage/headers.ts` standardize these headers for uploads and worker output.

## Signed URL usage

- `getSignedGetUrl` and `getSignedPutUrl` issue AWS SigV4 URLs through the configured S3 client.
- TTL defaults to `S3_SIGNED_URL_TTL_SEC` (300 seconds) but can be overridden per call.
- Originals and any other private assets must be accessed through signed GET URLs.
- Public objects can skip signing by using the direct HTTPS URL returned by `publicBaseUrl(bucket, key)`.

## Example URLs

Assuming `S3_ENDPOINT` is empty (AWS S3) and region `us-east-1`:

- Public poster: `https://<public-bucket>.s3.us-east-1.amazonaws.com/processed/posters/<mediaId>.jpg`
- Private original via signed URL: `https://<private-bucket>.s3.us-east-1.amazonaws.com/uploads/originals/<ownerId>/<mediaId>.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256...`

With MinIO running at `http://localhost:9000` the same helpers emit path-style URLs, for example `http://localhost:9000/<bucket>/processed/hls/<mediaId>/index.m3u8`.

## CORS and range requests

The MinIO CORS profile in `infra/minio/cors.json` enables GET, PUT, and HEAD with wild-carded headers and exposes `ETag`, `Accept-Ranges`, `Content-Length`, and `Content-Type`. Apply it to both buckets so browsers can request signed resources and issue ranged playback requests.

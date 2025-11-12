# Phase 3 Upload API

Secure upload flows are now available under `/api/media`. Every request must originate from an authenticated user session. The server validates metadata before allocating storage, enforces entitlements, and immediately schedules transcoding.

## POST `/api/media/upload`

Two request styles share the same endpoint.

### Signed PUT initialization

```json
POST /api/media/upload
Content-Type: application/json
{
  "fileName": "intro.mp4",
  "contentType": "video/mp4",
  "sizeBytes": 104857600,
  "estimatedDurationSec": 120
}
```

```json
200 OK
{
  "ok": true,
  "mediaId": "ck_media_123",
  "mode": "signed-put",
  "sourceKey": "uploads/originals/<userId>/ck_media_123.mp4",
  "signedUrl": "https://storage/signed-put",
  "maxSingleUploadBytes": 838860800,
  "next": {
    "checkStatusUrl": "/api/media/ck_media_123/status"
  }
}
```

Use the returned `signedUrl` for a single PUT of the original file. Originals are always written to the private bucket.

### Multipart fallback (development only)

```
POST /api/media/upload
Content-Type: multipart/form-data
file=<File>, estimatedDurationSec=90
```

```
200 OK
{
  "ok": true,
  "mediaId": "ck_media_456",
  "mode": "multipart",
  "sourceKey": "uploads/originals/<userId>/ck_media_456.webm",
  "maxSingleUploadBytes": 838860800,
  "next": {
    "checkStatusUrl": "/api/media/ck_media_456/status"
  }
}
```

In multipart mode the server reads the bytes, sniffs the MIME type, uploads to S3, and still queues a transcode job.

## Validation rules

* Only `video/mp4`, `video/quicktime`, and `video/webm` are accepted. Multipart uploads must pass server-side sniffing; a mismatch between declared and detected MIME is rejected.
* `sizeBytes` must be positive and no larger than `UPLOAD_MAX_SIZE_MB_DEV/PROD` (converted to bytes in `uploadConfig`).
* Daily per-user capacity is enforced via `UPLOAD_DAILY_USER_CAP_GB`. The request is rejected before any storage is allocated if the projected total would exceed the cap.
* Duration estimates are compared against the user’s media entitlements (`maxDurationPerVideoSec`) and the global `UPLOAD_MAX_DURATION_SEC`. Exceeding either returns `DURATION_EXCEEDED`.
* `canUploadVideo` also guards plan limits on the number of stored videos and total storage (`maxVideos`, `maxTotalStorageGB`).
* All files are created with `type="video"`, `status="uploaded"`, and `visibility="private"`. A `TranscodeJob` (status `queued`) is created in the same transaction, then pushed to the `media.transcode` BullMQ queue.

## Rate limits & quotas

* A Redis token bucket is maintained per user and per IP. Limits derive from `UPLOAD_RATE_LIMIT_PER_MIN` (refill) and `UPLOAD_RATE_LIMIT_BURST` (capacity).
* Daily upload bytes are tracked in Redis with an expiry at local midnight. Requests that would exceed `UPLOAD_DAILY_USER_CAP_GB` return `QUOTA_EXCEEDED`.
* After a successful init the byte counter is incremented so that later requests reflect reserved capacity.

## Error codes

| Code | HTTP | fa-IR message | Description |
| --- | --- | --- | --- |
| `INVALID_MIME` | 415 | نوع فایل مجاز نیست. | Declared type missing, not allowed, or mismatched from sniffing. |
| `TOO_LARGE` | 413 | حجم فایل از حد مجاز بیشتر است. | File exceeds the configured single-upload limit. |
| `RATE_LIMITED` | 429 | درخواست‌های شما بیش از حد مجاز است. بعداً دوباره تلاش کنید. | User/IP exceeded the token bucket. |
| `QUOTA_EXCEEDED` | 429 | سقف روزانه حجم آپلود شما تکمیل شده است. | Daily byte cap or plan quota would be exceeded. |
| `DURATION_EXCEEDED` | 422 | مدت ویدیو از سقف طرح شما بیشتر است. | Estimated duration is longer than the plan/global limit. |
| `UNKNOWN` | 4xx/5xx | پیام خطای عمومی. | Any other validation or server error. |

## Status polling

```
GET /api/media/{mediaId}/status
200 OK
{
  "ok": true,
  "mediaId": "ck_media_123",
  "status": "uploaded",
  "visibility": "private",
  "errorMessage": null,
  "durationSec": null,
  "width": null,
  "height": null,
  "sizeBytes": 104857600
}
```

Only the owner can query status. The endpoint always responds with `Cache-Control: no-store`.

## Smoke tests

1. Start the Next.js dev server:
   ```bash
   pnpm --filter @app/web dev
   ```
2. In another shell run the scripted checks (expects the dev server to keep running):
   ```bash
   pnpm --filter @app/web tsx apps/web/scripts/upload/init-signed-put.ts
   pnpm --filter @app/web tsx apps/web/scripts/upload/init-over-quota.ts
   pnpm --filter @app/web tsx apps/web/scripts/upload/status-check.ts
   ```
Each script automatically provisions a dev-only user, authenticates via NextAuth, and exits non-zero if the response deviates from the expected success/failure path.

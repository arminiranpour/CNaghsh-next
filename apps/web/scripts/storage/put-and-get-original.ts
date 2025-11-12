import { randomUUID } from "node:crypto";

import { loadStorageEnv } from "./env-loader";

loadStorageEnv();

const { cacheOriginal } = await import("../../lib/storage/headers");
const { getOriginalKey } = await import("../../lib/storage/keys");
const { head, putBuffer, remove } = await import("../../lib/storage/s3");
const { resolveBucketForVisibility } = await import("../../lib/storage/visibility");

const run = async () => {
  const ownerId = randomUUID();
  const mediaId = randomUUID();
  const key = getOriginalKey(ownerId, mediaId, "mp4");
  const bucket = resolveBucketForVisibility("private");
  const payload = Buffer.from(`test-payload-${Date.now()}`);

  await putBuffer(bucket, key, payload, "video/mp4", cacheOriginal());
  const metadata = await head(bucket, key);

  console.log(
    `Stored ${bucket}/${key} size=${metadata.ContentLength ?? 0} contentType=${metadata.ContentType ?? "unknown"}`,
  );

  await remove(bucket, key);
  console.log(`Removed ${bucket}/${key}`);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

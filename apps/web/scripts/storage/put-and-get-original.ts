import { randomUUID } from "node:crypto";

import "./env-loader";
import { cacheOriginal } from "../../lib/storage/headers";
import { getOriginalKey } from "../../lib/storage/keys";
import { head, putBuffer, remove } from "../../lib/storage/s3";
import { resolveBucketForVisibility } from "../../lib/storage/visibility";

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

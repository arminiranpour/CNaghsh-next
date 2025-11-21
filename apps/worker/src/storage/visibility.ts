import type { MediaVisibility } from "@prisma/client";

import { storageConfig } from "./config";

const PUBLIC_BUCKET = storageConfig.publicBucket || "media-public";
const PRIVATE_BUCKET = storageConfig.privateBucket;

const resolveBucketForVisibility = (visibility: MediaVisibility) => {
  if (visibility === "public") {
    return PUBLIC_BUCKET;
  }
  return PRIVATE_BUCKET;
};

export { resolveBucketForVisibility };

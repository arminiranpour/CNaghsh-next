import type { MediaVisibility } from "@prisma/client";

import { storageConfig } from "./config";

const resolveBucketForVisibility = (visibility: MediaVisibility) => {
  if (visibility === "public") {
    return storageConfig.publicBucket;
  }
  return storageConfig.privateBucket;
};

export { resolveBucketForVisibility };

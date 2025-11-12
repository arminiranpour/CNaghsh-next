import { storageConfig } from "./config";

type Visibility = "public" | "private";

const resolveBucketForVisibility = (visibility: Visibility) => {
  if (visibility === "public") {
    return storageConfig.publicBucket;
  }
  return storageConfig.privateBucket;
};

export { resolveBucketForVisibility };

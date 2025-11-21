import { storageConfig } from "./config";

type Visibility = "public" | "private";

const PUBLIC_BUCKET = storageConfig.publicBucket || "media-public";
const PRIVATE_BUCKET = storageConfig.privateBucket;

const resolveBucketForVisibility = (visibility: Visibility) => {
  if (visibility === "public") {
    return PUBLIC_BUCKET;
  }
  return PRIVATE_BUCKET;
};

export { resolveBucketForVisibility };

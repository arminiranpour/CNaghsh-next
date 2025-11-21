import { S3Client } from "@aws-sdk/client-s3";

import { storageConfig } from "./config";

const s3 = new S3Client({
  region: storageConfig.region,
  credentials: {
    accessKeyId: storageConfig.accessKey,
    secretAccessKey: storageConfig.secretKey,
  },
  endpoint: storageConfig.endpoint,
  forcePathStyle: storageConfig.forcePathStyle,
});

export { s3 };

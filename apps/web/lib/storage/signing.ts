import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { storageConfig } from "./config";
import { s3 } from "./s3";

const resolveTtl = (ttlSec?: number) => {
  const ttl = ttlSec ?? storageConfig.signedUrlTtlSec;
  if (!Number.isFinite(ttl) || ttl <= 0) {
    throw new Error("Signed URL TTL must be a positive number");
  }
  return Math.floor(ttl);
};

const getSignedGetUrl = async (bucket: string, key: string, ttlSec?: number) => {
  const expiresIn = resolveTtl(ttlSec);
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn });
};

const getSignedPutUrl = async (
  bucket: string,
  key: string,
  contentType: string,
  ttlSec?: number,
) => {
  const expiresIn = resolveTtl(ttlSec);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn });
};

export { getSignedGetUrl, getSignedPutUrl };

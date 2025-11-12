import { randomUUID } from "node:crypto";

import { loadStorageEnv } from "./env-loader";

loadStorageEnv();

const { storageConfig } = await import("../../lib/storage/config");
const { getSignedGetUrl } = await import("../../lib/storage/signing");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const run = async () => {
  const bucket = storageConfig.privateBucket;
  const key = `signed-test/${randomUUID()}`;
  const ttlSec = 5;

  const url = await getSignedGetUrl(bucket, key, ttlSec);
  const initial = await fetch(url, { method: "GET" });
  console.log(`Initial request status=${initial.status}`);

  await sleep((ttlSec + 2) * 1000);

  const expired = await fetch(url, { method: "GET" });
  console.log(`Expired request status=${expired.status}`);

  if (expired.status !== 403) {
    throw new Error(`Expected 403 after expiry, received ${expired.status}`);
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

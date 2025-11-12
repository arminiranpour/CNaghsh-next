import { loadStorageEnv } from "./env-loader";

loadStorageEnv();

const { storageConfig } = await import("../../lib/storage/config");
const { resolveBucketForVisibility } = await import("../../lib/storage/visibility");

const run = () => {
  const publicBucket = resolveBucketForVisibility("public");
  const privateBucket = resolveBucketForVisibility("private");
  console.log(`Configured public bucket=${publicBucket}`);
  console.log(`Configured private bucket=${privateBucket}`);
  console.log(
    `Buckets match=${publicBucket === privateBucket ? "yes" : "no"} endpoint=${storageConfig.endpoint ?? "aws"}`,
  );
};

try {
  run();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

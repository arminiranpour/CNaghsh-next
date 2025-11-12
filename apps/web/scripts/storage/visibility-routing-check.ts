import "./env-loader";
import { storageConfig } from "../../lib/storage/config";
import { resolveBucketForVisibility } from "../../lib/storage/visibility";

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

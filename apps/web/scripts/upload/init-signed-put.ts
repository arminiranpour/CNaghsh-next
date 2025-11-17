import { authenticateUploadUser, getBaseUrl, shutdownPrisma } from "./helpers";

const run = async () => {
  const baseUrl = getBaseUrl();
  const session = await authenticateUploadUser(baseUrl);
  const payload = {
    fileName: `smoke-${Date.now()}.mp4`,
    contentType: "video/mp4",
    sizeBytes: 50 * 1024 * 1024,
    estimatedDurationSec: 120,
  };
  const response = await fetch(new URL("/api/media/upload", baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: session.cookie,
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as {
    ok?: boolean;
    signedUrl?: string;
    mediaId?: string;
    next?: { finalizeUrl?: string };
  };
  if (!response.ok || !data?.ok || !data.mediaId) {
    throw new Error(`Upload init failed (${response.status})`);
  }
  console.log(`mediaId=${data.mediaId}`);
  if (data.signedUrl) {
    console.log(`signedUrl=${data.signedUrl}`);
  }
  if (data.next?.finalizeUrl) {
    console.log(`finalizeUrl=${data.next.finalizeUrl}`);
  }
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await shutdownPrisma();
  });

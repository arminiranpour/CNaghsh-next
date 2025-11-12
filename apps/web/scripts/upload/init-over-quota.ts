import { authenticateUploadUser, getBaseUrl, shutdownPrisma } from "./helpers";

const run = async () => {
  const baseUrl = getBaseUrl();
  const session = await authenticateUploadUser(baseUrl);
  const maxDuration = Number.parseInt(process.env.UPLOAD_MAX_DURATION_SEC ?? "180", 10);
  const payload = {
    fileName: `over-quota-${Date.now()}.mp4`,
    contentType: "video/mp4",
    sizeBytes: 10 * 1024 * 1024,
    estimatedDurationSec: Number.isFinite(maxDuration) ? maxDuration + 300 : 999,
  };
  const response = await fetch(new URL("/api/media/upload", baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: session.cookie,
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as { ok?: boolean; errorCode?: string; messageFa?: string };
  if (response.status < 400 || data?.ok !== false) {
    throw new Error("Expected quota failure but request succeeded");
  }
  console.log(`errorCode=${data.errorCode ?? "unknown"}`);
  if (data.messageFa) {
    console.log(`messageFa=${data.messageFa}`);
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

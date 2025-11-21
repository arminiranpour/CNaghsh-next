import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  authenticateUploadUser,
  getBaseUrl,
  shutdownPrisma,
} from "./helpers";

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

type UploadInitResponse = {
  ok?: boolean;
  mediaId?: string;
  mode?: string;
  signedUrl?: string;
  sourceKey?: string;
  next?: { finalizeUrl?: string; checkStatusUrl?: string };
};

type FinalizeResponse = { ok?: boolean; status?: string };
type StatusResponse = {
  ok?: boolean;
  status?: string;
  errorMessage?: string | null;
};

const run = async () => {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error("Usage: pnpm --filter @app/web tsx apps/web/scripts/upload/signed-put-flow.mts <path-to-video> [content-type]");
  }
  const contentType = process.argv[3] ?? "video/mp4";
  const buffer = await readFile(filePath);
  const fileName = path.basename(filePath);

  const baseUrl = getBaseUrl();
  const session = await authenticateUploadUser(baseUrl);

  const initResponse = await fetch(new URL("/api/media/upload", baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: session.cookie,
    },
    body: JSON.stringify({
      fileName,
      contentType,
      sizeBytes: buffer.length,
    }),
  });
  const initPayload = (await initResponse.json()) as UploadInitResponse;
  if (!initResponse.ok || !initPayload?.ok || !initPayload.mediaId) {
    throw new Error(`Upload init failed (${initResponse.status})`);
  }
  if (!initPayload.signedUrl) {
    throw new Error("Signed URL missing in init payload");
  }

  const mediaId = initPayload.mediaId;
  console.log(`mediaId=${mediaId}`);
  console.log(`sourceKey=${initPayload.sourceKey ?? "unknown"}`);
  console.log("Uploading original via signed PUT...");

  const putResponse = await fetch(initPayload.signedUrl, {
    method: "PUT",
    headers: {
      "content-type": contentType,
    },
    body: buffer,
  });
  if (!putResponse.ok) {
    throw new Error(`Signed PUT failed (${putResponse.status})`);
  }
  console.log("Upload complete, finalizing...");

  const finalizePath = initPayload.next?.finalizeUrl ?? `/api/media/${mediaId}/finalize`;
  const finalizeTarget = new URL(finalizePath, baseUrl);
  const finalizeResponse = await fetch(finalizeTarget, {
    method: "POST",
    headers: { cookie: session.cookie },
  });
  const finalizePayload = (await finalizeResponse.json()) as FinalizeResponse;
  if (!finalizeResponse.ok || !finalizePayload?.ok) {
    throw new Error(`Finalize failed (${finalizeResponse.status})`);
  }
  console.log(`Finalize acknowledged, status=${finalizePayload.status ?? "unknown"}`);

  const statusUrl = new URL(`/api/media/${mediaId}/status`, baseUrl);
  while (true) {
    const statusResponse = await fetch(statusUrl, {
      headers: { cookie: session.cookie, "cache-control": "no-store" },
    });
    const statusPayload = (await statusResponse.json()) as StatusResponse;
    if (!statusResponse.ok || !statusPayload?.ok || !statusPayload.status) {
      throw new Error(`Status poll failed (${statusResponse.status})`);
    }
    console.log(`status=${statusPayload.status}`);
    if (statusPayload.status === "ready") {
      console.log("✅ Media is ready for playback.");
      break;
    }
    if (statusPayload.status === "failed") {
      throw new Error(`Transcode failed: ${statusPayload.errorMessage ?? "unknown"}`);
    }
    await sleep(3000);
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

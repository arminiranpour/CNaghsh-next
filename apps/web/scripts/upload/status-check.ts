import { randomUUID } from "node:crypto";

import { MediaStatus, MediaType, MediaVisibility } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import {
  authenticateUploadUser,
  ensureUploadTestUser,
  getBaseUrl,
  shutdownPrisma,
} from "./helpers";

const ensureMediaAsset = async (ownerUserId: string) => {
  const existing = await prisma.mediaAsset.findFirst({
    where: { ownerUserId },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    return existing.id;
  }
  const mediaId = randomUUID();
  const created = await prisma.mediaAsset.create({
    data: {
      id: mediaId,
      ownerUserId,
      type: MediaType.video,
      status: MediaStatus.uploaded,
      visibility: MediaVisibility.private,
      sourceKey: `uploads/originals/${ownerUserId}/${mediaId}.mp4`,
      sizeBytes: BigInt(1024),
    },
    select: { id: true },
  });
  return created.id;
};

const run = async () => {
  const baseUrl = getBaseUrl();
  const user = await ensureUploadTestUser();
  const mediaId = await ensureMediaAsset(user.id);
  const session = await authenticateUploadUser(baseUrl);
  const response = await fetch(new URL(`/api/media/${mediaId}/status`, baseUrl), {
    headers: { cookie: session.cookie },
  });
  const data = (await response.json()) as { ok?: boolean; status?: string; visibility?: string };
  if (!response.ok || data?.ok !== true) {
    throw new Error(`Status check failed (${response.status})`);
  }
  console.log(`mediaId=${mediaId} status=${data.status} visibility=${data.visibility}`);
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await shutdownPrisma();
  });

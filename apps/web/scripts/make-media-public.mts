// apps/web/scripts/make-media-public.mts
import { prisma } from "../lib/prisma";

async function run() {
  const mediaId = process.env.MEDIA_ID;
  if (!mediaId) throw new Error("MEDIA_ID is required");
  const updated = await prisma.mediaAsset.update({
    where: { id: mediaId },
    data: { visibility: "public" },
  });
  console.log(`Updated media ${updated.id} to visibility=${updated.visibility}`);
}

run().finally(() => prisma.$disconnect());

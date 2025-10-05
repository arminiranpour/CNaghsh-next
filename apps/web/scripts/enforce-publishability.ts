import { prisma } from "@/lib/prisma";
import { enforceUserProfileVisibility, getPublishability } from "@/lib/profile/enforcement";

async function main() {
  const publicProfiles = await prisma.profile.findMany({
    where: { visibility: "PUBLIC" },
    select: { id: true, userId: true },
  });

  let autoUnpublished = 0;

  for (const profile of publicProfiles) {
    const publishability = await getPublishability(profile.userId);

    if (!publishability.canPublish) {
      const result = await enforceUserProfileVisibility(profile.userId);

      if (result === "auto_unpublished") {
        autoUnpublished += 1;
      }
    }
  }

  console.log(`Auto-unpublished ${autoUnpublished} profiles.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

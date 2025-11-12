import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
(async () => {
  const m = await p.mediaAsset.findFirst({ include: { owner: true, transcodeJobs: true } });
  const ok = !!m && !!m.owner && (m?.transcodeJobs?.length ?? 0) >= 1;
  console.log('hasAsset+Owner+Job:', ok);
  if (!ok) console.log({ foundAsset: !!m, hasOwner: !!m?.owner, jobCount: m?.transcodeJobs?.length ?? 0 });
  await p.$disconnect();
})();
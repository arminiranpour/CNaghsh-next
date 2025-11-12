import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function jsonReplacer(_key: string, value: unknown) {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  return value;
}

async function main() {
  const mediaAssets = await prisma.mediaAsset.findMany({
    include: {
      owner: {
        select: {
          id: true,
          email: true,
        },
      },
      transcodeJobs: true,
    },
  });

  const transcodeJobs = await prisma.transcodeJob.findMany({
    include: {
      mediaAsset: {
        select: {
          id: true,
          ownerUserId: true,
          type: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log('Media assets count:', mediaAssets.length);
  console.log(
    JSON.stringify(
      mediaAssets,
      jsonReplacer,
      2,
    ),
  );

  console.log('Transcode jobs count:', transcodeJobs.length);
  console.log(
    JSON.stringify(
      transcodeJobs,
      jsonReplacer,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error('Failed to run media check script:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

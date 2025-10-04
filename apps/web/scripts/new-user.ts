import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateDevEmail() {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  return `sandbox+${timestamp}@example.com`;
}

async function main() {
  const emailArg = process.argv[2];
  const email = emailArg ?? generateDevEmail();

  const user = await prisma.user.create({
    data: {
      email,
    },
  });

  console.log(user.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

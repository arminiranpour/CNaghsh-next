import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function generateDevEmail() {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  return `sandbox+${timestamp}@example.com`;
}

async function main() {
  const emailArg = process.argv[2];
  const passwordArg = process.argv[3];

  const email = emailArg ?? generateDevEmail();
  const password = passwordArg ?? "Password123";

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
    },
  });

  console.log(`Created user ${user.id} with email ${email}`);
  if (!passwordArg) {
    console.log(`Temporary password: ${password}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

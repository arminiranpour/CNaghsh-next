import { PrismaClient } from "@prisma/client";


type GlobalWithPrisma = typeof globalThis & {
 prisma?: PrismaClient;};


const globalForPrisma = globalThis as GlobalWithPrisma;

const createClient = () => {
  return new PrismaClient();
};

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
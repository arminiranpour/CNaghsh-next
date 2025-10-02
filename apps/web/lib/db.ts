import { PrismaClient } from "@prisma/client";

type ExtendedPrismaClient = PrismaClient & Record<string, unknown>;

type GlobalWithPrisma = typeof globalThis & {
  prisma?: ExtendedPrismaClient;
};

const createClient = (): ExtendedPrismaClient => {
  return new PrismaClient() as ExtendedPrismaClient;};

const globalForPrisma = globalThis as GlobalWithPrisma;

export const prisma: ExtendedPrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
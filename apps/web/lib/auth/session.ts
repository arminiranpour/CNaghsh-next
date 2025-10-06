import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";

import { getAuthConfig } from "./config";

export async function getServerAuthSession() {
  return getServerSession(getAuthConfig(prisma));
}

import NextAuth from "next-auth";

import { getAuthConfig } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";

const handler = NextAuth(getAuthConfig(prisma));

export const GET = handler;
export const POST = handler;

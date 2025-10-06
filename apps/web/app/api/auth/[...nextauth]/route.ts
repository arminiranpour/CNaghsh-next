import NextAuth from "next-auth";

import { getAuthConfig } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";

const handler = NextAuth(getAuthConfig(prisma));

export { handler as GET, handler as POST };


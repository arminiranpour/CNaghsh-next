import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";

import { getAuthConfig } from "./config";

export async function getServerAuthSession() {
  try {
    return await getServerSession(getAuthConfig(prisma));
  } catch (error) {
    // When route handlers are invoked outside of a Next.js request context (for example,
    // during QA scripts that import the handlers directly), `getServerSession` throws an
    // error about missing request storage. In those cases, fall back to "no session" so
    // alternate authentication mechanisms (like explicit admin headers) can continue to
    // operate.
    if (
      error instanceof Error &&
      error.message.includes("was called outside a request scope")
    ) {
      return null;
    }

    throw error;
  }}

import { type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

export type AdminSessionUser = { id: string; role: "ADMIN" };

const ADMIN_HEADER = "x-admin-user-id";
const ADMIN_COOKIE = "ADMIN_USER_ID";

type RequestLike =
  | Pick<NextRequest, "headers" | "cookies">
  | {
      headers?: Headers | null;
      cookies?: {
        get: (name: string) => { value: string } | undefined;
      } | null;
    };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const loadAdmin = async (adminId: string) => {
  if (!isNonEmptyString(adminId)) {
    return null;
  }

  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, role: true },
  });

  if (admin?.role === "ADMIN" && isNonEmptyString(admin.id)) {
    return { id: admin.id, role: "ADMIN" } satisfies AdminSessionUser;
  }

  return null;
};

const isDevBypassEnabled = () =>
  process.env.NODE_ENV !== "production" || process.env.DEV_ADMIN_BYPASS === "true";

const resolveBypassAdmin = async (request?: RequestLike | null) => {
  if (!request || !isDevBypassEnabled()) {
    return null;
  }

  const headerValue = request.headers?.get(ADMIN_HEADER) ?? undefined;
  if (isNonEmptyString(headerValue)) {
    const adminFromHeader = await loadAdmin(headerValue);
    if (adminFromHeader) {
      return adminFromHeader;
    }
  }

  const cookieValue = request.cookies?.get(ADMIN_COOKIE)?.value ?? undefined;
  if (isNonEmptyString(cookieValue)) {
    const adminFromCookie = await loadAdmin(cookieValue);
    if (adminFromCookie) {
      return adminFromCookie;
    }
  }

  return null;
};

const resolveSessionAdmin = async () => {
  try {
    const { getServerAuthSession } = await import("@/lib/auth/session");
    const session = await getServerAuthSession();
    const sessionUser = session?.user;

    if (sessionUser?.role === "ADMIN" && isNonEmptyString(sessionUser.id)) {
      return { id: sessionUser.id, role: "ADMIN" } satisfies AdminSessionUser;
    }
  } catch (error) {
    // Ignore NextAuth resolution errors outside of a request scope.
  }

  return null;
};

export async function ensureAdmin(request?: RequestLike | null): Promise<AdminSessionUser | null> {
  const bypassAdmin = await resolveBypassAdmin(request ?? null);
  if (bypassAdmin) {
    return bypassAdmin;
  }

  const sessionAdmin = await resolveSessionAdmin();
  if (sessionAdmin) {
    return sessionAdmin;
  }

  return null;
}

export const findAdminUser = ensureAdmin;

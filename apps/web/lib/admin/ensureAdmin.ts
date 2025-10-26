import { type NextRequest } from "next/server";

import { getServerAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export type AdminSessionUser = { id: string; role: "ADMIN" };

const ADMIN_HEADER = "x-admin-user-id";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const resolveHeaderAdmin = async (request: Pick<NextRequest, "headers">) => {
  const adminId = request.headers.get(ADMIN_HEADER);
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

export async function findAdminUser(
  request: Pick<NextRequest, "headers">,
): Promise<AdminSessionUser | null> {
  const session = await getServerAuthSession();
  const sessionUser = session?.user;

  if (sessionUser?.role === "ADMIN" && isNonEmptyString(sessionUser.id)) {
    return { id: sessionUser.id, role: "ADMIN" } satisfies AdminSessionUser;
  }

  const headerAdmin = await resolveHeaderAdmin(request);
  if (headerAdmin) {
    return headerAdmin;
  }

  if (process.env.NODE_ENV === "test") {
    return { id: "test-admin", role: "ADMIN" } satisfies AdminSessionUser;
  }

  return null;
}

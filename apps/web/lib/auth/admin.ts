import type { User } from "@prisma/client";
import type { Session } from "next-auth";

import { getServerAuthSession } from "@/lib/auth/session";

type UserLike = User | { role?: string; email?: string } | null | undefined;

const adminEmailSet: Set<string> = (() => {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) {
    return new Set();
  }
  const entries = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
  return new Set(entries);
})();

const isAdminRole = (role: string | undefined): boolean => {
  if (!role) {
    return false;
  }
  return role.toUpperCase() === "ADMIN";
};

const isAdminEmail = (email: string | undefined | null): boolean => {
  if (!email) {
    return false;
  }
  return adminEmailSet.has(email.trim().toLowerCase());
};

export function isAdminUser(user: UserLike): boolean {
  if (!user) {
    return false;
  }
  const role = typeof user.role === "string" ? user.role : undefined;
  if (isAdminRole(role)) {
    return true;
  }
  const email = typeof user.email === "string" ? user.email : undefined;
  if (isAdminEmail(email)) {
    return true;
  }
  return false;
}

export async function requireAdminSession(): Promise<{
  session: Session;
  user: NonNullable<Session["user"]>;
}> {
  const session = await getServerAuthSession();
  if (!session || !session.user) {
    throw new Error("ADMIN_SESSION_REQUIRED");
  }
  if (!isAdminUser(session.user)) {
    throw new Error("ADMIN_ACCESS_DENIED");
  }
  return { session, user: session.user };
}

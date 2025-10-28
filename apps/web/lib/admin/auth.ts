import type { SessionUser } from "next-auth";

import { getServerAuthSession } from "@/lib/auth/session";

export class AdminForbiddenError extends Error {
  constructor(message = "دسترسی شما به بخش مدیریت مجاز نیست.") {
    super(message);
    this.name = "AdminForbiddenError";
  }
}

export type AdminSessionUser = SessionUser & { id: string; role: "ADMIN" };

export const ADMIN_FORBIDDEN_MESSAGE =
  "دسترسی شما به بخش مدیریت صورتحساب مجاز نیست. لطفاً با مدیر سیستم هماهنگ کنید.";

export async function requireAdmin(): Promise<AdminSessionUser> {
  const session = await getServerAuthSession();
  const user = session?.user;

  if (!user || user.role !== "ADMIN" || typeof user.id !== "string" || user.id.length === 0) {
    throw new AdminForbiddenError(ADMIN_FORBIDDEN_MESSAGE);
  }

  return {
    ...user,
    id: user.id,
    role: "ADMIN",
  };
}

export async function getOptionalAdmin(): Promise<AdminSessionUser | null> {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof AdminForbiddenError) {
      return null;
    }
    throw error;
  }
}

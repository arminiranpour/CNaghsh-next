"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth/session";
import { nameSchema, passwordChangeSchema } from "@/lib/validation/user";

type ActionResult = {
  ok: boolean;
  error?: string;
};

const SETTINGS_PATHS: Array<string> = [
  "/dashboard",
  "/dashboard/settings",
];

const AUTH_ERROR_MESSAGE = "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.";
const GENERIC_ERROR_MESSAGE = "خطایی رخ داد. لطفاً دوباره تلاش کنید.";

async function ensureSessionUser() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    throw new Error(AUTH_ERROR_MESSAGE);
  }

  return session.user.id;
}

async function revalidateSettings() {
  for (const path of SETTINGS_PATHS) {
    revalidatePath(path);
  }
}

export async function updateName(formData: FormData): Promise<ActionResult> {
  try {
    const userId = await ensureSessionUser();
    const rawName = formData.get("name");
    const parsed = nameSchema.safeParse(typeof rawName === "string" ? rawName : "");

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        ok: false,
        error: issue?.message ?? GENERIC_ERROR_MESSAGE,
      };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { name: parsed.data },
    });

    await revalidateSettings();

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_ERROR_MESSAGE) {
      return { ok: false, error: AUTH_ERROR_MESSAGE };
    }

    console.error("updateName", error);
    return { ok: false, error: GENERIC_ERROR_MESSAGE };
  }
}

export async function changePassword(formData: FormData): Promise<ActionResult> {
  try {
    const userId = await ensureSessionUser();

    const parsed = passwordChangeSchema.safeParse({
      currentPassword: formData.get("currentPassword") ?? "",
      newPassword: formData.get("newPassword") ?? "",
      confirmNewPassword: formData.get("confirmNewPassword") ?? "",
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        ok: false,
        error: issue?.message ?? GENERIC_ERROR_MESSAGE,
      };
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      return { ok: false, error: GENERIC_ERROR_MESSAGE };
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValid) {
      return { ok: false, error: "رمز عبور فعلی نادرست است." };
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await revalidateSettings();

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_ERROR_MESSAGE) {
      return { ok: false, error: AUTH_ERROR_MESSAGE };
    }

    console.error("changePassword", error);
    return { ok: false, error: GENERIC_ERROR_MESSAGE };
  }
}

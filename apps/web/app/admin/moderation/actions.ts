"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SessionUser } from "next-auth";

import { getServerAuthSession } from "@/lib/auth/session";
import {
  approveProfile,
  hideProfile,
  rejectProfile,
  revertToPending,
  unhideProfile,
} from "@/lib/profile/moderation";

const AUTH_ERROR = "دسترسی مجاز نیست.";
const GENERIC_ERROR = "خطایی رخ داد. لطفاً دوباره تلاش کنید.";

const idSchema = z.string().cuid();
const reasonSchema = z
  .string({ invalid_type_error: "متن وارد شده معتبر نیست." })
  .trim()
  .min(1, "وارد کردن دلیل الزامی است.")
  .max(2000, "حداکثر ۲۰۰۰ کاراکتر مجاز است.");

const optionalNoteSchema = z
  .string({ invalid_type_error: "متن وارد شده معتبر نیست." })
  .trim()
  .max(2000, "حداکثر ۲۰۰۰ کاراکتر مجاز است.")
  .transform((value: string) => (value.length ? value : undefined));

type AdminSessionUser = SessionUser & { id: string; role: "ADMIN" };

async function ensureAdmin(): Promise<AdminSessionUser> {
  const session = await getServerAuthSession();
  const user = session?.user;

  if (!user || user.role !== "ADMIN" || typeof user.id !== "string" || user.id.length === 0) {
    throw new Error(AUTH_ERROR);
  }

  return {
    ...user,
    id: user.id,
    role: "ADMIN",
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? GENERIC_ERROR;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return GENERIC_ERROR;
}

async function revalidateModerationPages(profileId: string) {
  await revalidatePath("/admin/moderation");
  await revalidatePath(`/admin/moderation/${profileId}`);
}

export async function approveAction(profileId: string, note?: string) {
  try {
    const admin = await ensureAdmin();
    const id = idSchema.parse(profileId);
    const parsedNote = note !== undefined ? optionalNoteSchema.parse(note) : undefined;

    await approveProfile(id, admin.id, parsedNote);
    await revalidateModerationPages(id);

    return { ok: true } as const;
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) } as const;
  }
}

export async function rejectAction(profileId: string, reason: string) {
  try {
    const admin = await ensureAdmin();
    const id = idSchema.parse(profileId);
    const parsedReason = reasonSchema.parse(reason);

    await rejectProfile(id, admin.id, parsedReason);
    await revalidateModerationPages(id);

    return { ok: true } as const;
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) } as const;
  }
}

export async function revertPendingAction(profileId: string, note?: string) {
  try {
    const admin = await ensureAdmin();
    const id = idSchema.parse(profileId);
    const parsedNote = note !== undefined ? optionalNoteSchema.parse(note) : undefined;

    await revertToPending(id, admin.id, parsedNote);
    await revalidateModerationPages(id);

    return { ok: true } as const;
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) } as const;
  }
}

export async function hideAction(profileId: string) {
  try {
    const admin = await ensureAdmin();
    const id = idSchema.parse(profileId);

    await hideProfile(id, admin.id);
    await revalidateModerationPages(id);

    return { ok: true } as const;
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) } as const;
  }
}

export async function unhideAction(profileId: string) {
  try {
    const admin = await ensureAdmin();
    const id = idSchema.parse(profileId);

    await unhideProfile(id, admin.id);
    await revalidateModerationPages(id);

    return { ok: true } as const;
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) } as const;
  }
}

const bulkActionSchema = z.object({
  type: z.enum(["APPROVE", "REJECT", "HIDE", "UNHIDE"]),
  ids: z.array(z.string().cuid()).min(1, "حداقل یک پروفایل را انتخاب کنید."),
  payload: z
    .object({
      reason: reasonSchema.optional(),
      note: optionalNoteSchema.optional(),
    })
    .optional(),
});

export async function bulkAction(input: {
  type: "APPROVE" | "REJECT" | "HIDE" | "UNHIDE";
  ids: string[];
  payload?: { reason?: string; note?: string };
}) {
  try {
    const admin = await ensureAdmin();
    const parsed = bulkActionSchema.parse(input);

    if (parsed.type === "REJECT" && !parsed.payload?.reason) {
      throw new Error("وارد کردن دلیل رد الزامی است.");
    }

    for (const id of parsed.ids) {
      if (parsed.type === "APPROVE") {
        await approveProfile(id, admin.id, parsed.payload?.note);
      } else if (parsed.type === "REJECT") {
        await rejectProfile(id, admin.id, parsed.payload?.reason ?? "");
      } else if (parsed.type === "HIDE") {
        await hideProfile(id, admin.id);
      } else if (parsed.type === "UNHIDE") {
        await unhideProfile(id, admin.id);
      }

      await revalidatePath(`/admin/moderation/${id}`);
    }

    await revalidatePath("/admin/moderation");

    return { ok: true } as const;
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) } as const;
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";

import { getServerAuthSession } from "@/lib/auth/session";
import { approveJobAdmin } from "@/lib/jobs/admin/approveJob";
import { closeJobByAdmin } from "@/lib/jobs/admin/closeJobAdmin";
import { featureJobAdmin, type FeatureJobCommand } from "@/lib/jobs/admin/featureJob";
import { InvalidFeatureScheduleError, InvalidModerationTransitionError } from "@/lib/jobs/admin/common";
import { rejectJobAdmin } from "@/lib/jobs/admin/rejectJob";
import { suspendJobAdmin } from "@/lib/jobs/admin/suspendJob";
import { JobNotFoundError } from "@/lib/jobs/errors";

const idSchema = z.string().cuid({ message: "شناسه آگهی معتبر نیست." });
const noteSchema = z
  .string({ invalid_type_error: "توضیح وارد شده معتبر نیست." })
  .trim()
  .max(500, "حداکثر ۵۰۰ کاراکتر مجاز است.");

const featureCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("PRESET"), days: z.union([z.literal(7), z.literal(14), z.literal(30)]) }),
  z.object({
    type: z.literal("CUSTOM"),
    until: z
      .string({ invalid_type_error: "تاریخ معتبر نیست." })
      .refine((value) => {
        const parsed = new Date(value);
        return !Number.isNaN(parsed.getTime());
      }, "تاریخ معتبر نیست.")
      .transform((value) => new Date(value)),
  }),
  z.object({ type: z.literal("CLEAR") }),
]);

type FeatureCommandInput = z.infer<typeof featureCommandSchema>;

type SimpleActionResult = { ok: true } | { ok: false; error: string };

type AdminUser = { id: string; role: "ADMIN" };

async function ensureAdmin(): Promise<AdminUser> {
  const session = await getServerAuthSession();
  const user = session?.user;

  if (!user || user.role !== "ADMIN" || typeof user.id !== "string" || user.id.length === 0) {
    notFound();
  }

  return { id: user.id, role: "ADMIN" };
}

function parseOptionalNote(note?: string): string | undefined {
  if (note === undefined) {
    return undefined;
  }
  const parsed = noteSchema.parse(note);
  return parsed.length > 0 ? parsed : undefined;
}

function parseFeatureCommand(command: FeatureCommandInput): FeatureJobCommand {
  if (command.type === "CUSTOM") {
    return { type: "CUSTOM", until: command.until };
  }
  if (command.type === "PRESET") {
    return { type: "PRESET", days: command.days };
  }
  return { type: "CLEAR" };
}

function translateError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "ورودی ارسال شده معتبر نیست.";
  }

  if (error instanceof JobNotFoundError) {
    return "آگهی موردنظر یافت نشد.";
  }

  if (error instanceof InvalidModerationTransitionError) {
    return "تغییر وضعیت در حالت فعلی مجاز نیست.";
  }

  if (error instanceof InvalidFeatureScheduleError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "خطایی رخ داد. لطفاً دوباره تلاش کنید.";
}

async function revalidateAdminJobPages(jobId: string) {
  await revalidatePath("/admin/jobs");
  await revalidatePath(`/admin/jobs/${jobId}`);
}

export async function approveJobAction(jobId: string): Promise<SimpleActionResult> {
  try {
    const admin = await ensureAdmin();
    const id = idSchema.parse(jobId);

    await approveJobAdmin(id, admin.id);
    await revalidateAdminJobPages(id);

    return { ok: true };
  } catch (error) {
    return { ok: false, error: translateError(error) };
  }
}

export async function rejectJobAction(jobId: string, note?: string): Promise<SimpleActionResult> {
  try {
    const admin = await ensureAdmin();
    const id = idSchema.parse(jobId);
    const parsedNote = parseOptionalNote(note);

    await rejectJobAdmin(id, admin.id, parsedNote);
    await revalidateAdminJobPages(id);

    return { ok: true };
  } catch (error) {
    return { ok: false, error: translateError(error) };
  }
}

export async function suspendJobAction(jobId: string, note?: string): Promise<SimpleActionResult> {
  try {
    const admin = await ensureAdmin();
    const id = idSchema.parse(jobId);
    const parsedNote = parseOptionalNote(note);

    await suspendJobAdmin(id, admin.id, parsedNote);
    await revalidateAdminJobPages(id);

    return { ok: true };
  } catch (error) {
    return { ok: false, error: translateError(error) };
  }
}

export async function featureJobAction(
  jobId: string,
  command: FeatureCommandInput,
): Promise<SimpleActionResult> {
  try {
    const admin = await ensureAdmin();
    const id = idSchema.parse(jobId);
    const parsed = featureCommandSchema.parse(command);
    const featureCommand = parseFeatureCommand(parsed);

    await featureJobAdmin(id, admin.id, featureCommand);
    await revalidateAdminJobPages(id);

    return { ok: true };
  } catch (error) {
    return { ok: false, error: translateError(error) };
  }
}

export async function closeJobAction(jobId: string): Promise<SimpleActionResult> {
  try {
    const admin = await ensureAdmin();
    const id = idSchema.parse(jobId);

    await closeJobByAdmin(id, admin.id);
    await revalidateAdminJobPages(id);

    return { ok: true };
  } catch (error) {
    return { ok: false, error: translateError(error) };
  }
}

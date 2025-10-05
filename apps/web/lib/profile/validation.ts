import { z } from "zod";

import { SKILL_KEYS } from "./skills";

const AVATAR_URL_ERROR = "لطفاً تصویر پروفایل معتبر انتخاب کنید.";

const AVATAR_UPLOAD_REGEX = /^\/uploads\/[A-Za-z0-9/_.-]+$/;

function isValidAvatarUrl(value: string): boolean {
  if (value === "") {
    return true;
  }

  if (AVATAR_UPLOAD_REGEX.test(value)) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (error) {
    return false;
  }
}

export const personalInfoSchema = z.object({
  firstName: z.string().trim().min(1, "لطفاً نام را وارد کنید.").max(191),
  lastName: z.string().trim().min(1, "لطفاً نام خانوادگی را وارد کنید.").max(191),
  stageName: z.string().trim().max(191).optional().or(z.literal("")),
  age: z.coerce.number().int().min(5, "سن معتبر نیست.").max(120, "سن معتبر نیست."),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{10}$/, "شماره تلفن باید با 0 شروع شده و 11 رقم باشد."),
  address: z.string().trim().max(1000).optional().or(z.literal("")),
  cityId: z
    .string()
    .trim()
    .min(1, "لطفاً شهر را انتخاب کنید."),
  avatarUrl: z
    .string()
    .trim()
    .refine(isValidAvatarUrl, AVATAR_URL_ERROR),
  bio: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const skillsSchema = z.object({
  skills: z
    .array(z.enum(SKILL_KEYS as unknown as [any, ...any[]]))
    .optional()
    .default([]),
});

export function validateReadyToPublish(input: unknown) {
  return personalInfoSchema.safeParse(input);
}

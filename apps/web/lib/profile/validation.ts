import { z } from "zod";

import { SKILL_KEYS } from "./skills";

export const personalInfoSchema = z.object({
  firstName: z.string().trim().min(1, "لطفاً نام را وارد کنید.").max(191),
  lastName: z.string().trim().min(1, "لطفاً نام خانوادگی را وارد کنید.").max(191),
  stageName: z.string().trim().max(191).optional().or(z.literal("")),
  age: z.coerce.number().int().min(5, "سن معتبر نیست.").max(120, "سن معتبر نیست."),
  phone: z
    .string()
    .regex(/^0\d{9}$/, "شماره تلفن باید با 0 شروع شده و 10 رقم باشد."),
  address: z.string().trim().max(1000).optional().or(z.literal("")),
  cityId: z
    .string()
    .trim()
    .min(1, "لطفاً شهر را انتخاب کنید."),
  avatarUrl: z
    .string()
    .trim()
    .url("لطفاً تصویر پروفایل معتبر انتخاب کنید."),
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

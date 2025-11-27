import { z } from "zod";

import { LANGUAGE_LEVEL_MAX } from "./languages";
import { SKILL_KEYS, type SkillKey } from "./skills";

const AVATAR_URL_ERROR = "لطفاً تصویر پروفایل معتبر انتخاب کنید.";

const AVATAR_UPLOAD_REGEX = /^\/uploads\/[A-Za-z0-9/_.-]+$/;
const INTRO_VIDEO_ERROR = "ویدیوی انتخاب شده معتبر نیست.";

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
  introVideoMediaId: z
    .string()
    .trim()
    .max(191, INTRO_VIDEO_ERROR)
    .optional()
    .or(z.literal("")),
});

const SKILL_KEY_VALUES = SKILL_KEYS as [SkillKey, ...SkillKey[]];

export const skillsSchema = z.object({
  skills: z.array(z.enum(SKILL_KEY_VALUES)).optional().default([]),
});

const experienceEntrySchema = z.object({
  role: z.string().trim().min(1, "لطفاً نقش را وارد کنید.").max(191),
  work: z
    .string()
    .trim()
    .min(1, "لطفاً نام اثر یا نمایش را وارد کنید.")
    .max(191),
});

export const experienceSchema = z.object({
  theatre: z.array(experienceEntrySchema).optional().default([]),
  shortFilm: z.array(experienceEntrySchema).optional().default([]),
  cinema: z.array(experienceEntrySchema).optional().default([]),
  tv: z.array(experienceEntrySchema).optional().default([]),
});

const languageEntrySchema = z.object({
  label: z.string().trim().min(1, "لطفاً نام زبان را وارد کنید.").max(191),
  level: z
    .coerce.number()
    .int()
    .min(1, "سطح باید بین ۱ تا ۵ باشد.")
    .max(LANGUAGE_LEVEL_MAX, "سطح باید بین ۱ تا ۵ باشد."),
});

export const languagesSchema = z.array(languageEntrySchema).optional().default([]);

export const accentsSchema = z.array(z.string().trim().max(100)).optional().nullable();

export const degreeEntrySchema = z.object({
  degreeLevel: z.string().trim().max(100),
  major: z.string().trim().max(100),
});

export const degreesSchema = z.array(degreeEntrySchema).optional().nullable();

export const voiceEntrySchema = z.object({
  mediaId: z.string().trim().min(1),
  url: z.string().url(),
  title: z.string().trim().max(200).optional().nullable(),
  duration: z.number().nonnegative().optional().nullable(),
});

export const voicesSchema = z.array(voiceEntrySchema).optional().nullable();

export const profileVideoEntrySchema = z.object({
  mediaId: z.string().min(1),
  title: z.string().trim().max(200).optional(),
  order: z.number().int().optional(),
});

export const profileVideosSchema = z
  .array(profileVideoEntrySchema)
  .optional()
  .nullable();

export function validateReadyToPublish(input: unknown) {
  return personalInfoSchema.safeParse(input);
}

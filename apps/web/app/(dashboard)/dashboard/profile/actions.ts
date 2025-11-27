"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  enforceUserProfileVisibility,
  getPublishability,
} from "@/lib/profile/enforcement";
import {
  MODERATION_PROFILE_SELECT,
  maybeMarkPendingOnCriticalEdit,
} from "@/lib/profile/moderation";
import {
  accentsSchema,
  experienceSchema,
  degreesSchema,
  languagesSchema,
  personalInfoSchema,
  profileVideosSchema,
  voicesSchema,
  skillsSchema,
} from "@/lib/profile/validation";
import { deleteByUrl, saveImageFromFormData } from "@/lib/media/storage";
import {
  emitUserPublishSubmitted,
  emitUserUnpublished,
} from "@/lib/notifications/events";
import { validateOwnedReadyVideo } from "@/lib/media/ownership";

const GENERIC_ERROR = "خطایی رخ داد. لطفاً دوباره تلاش کنید.";
const AUTH_ERROR = "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.";
const NO_PROFILE_ERROR = "ابتدا اطلاعات پروفایل خود را تکمیل کنید.";
const PUBLISH_ENTITLEMENT_ERROR = "برای انتشار پروفایل نیاز به اشتراک فعال دارید.";

const DASHBOARD_PROFILE_PATHS = [
  "/dashboard/profile",
  "/profiles",
];

const DIGIT_MAP: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

function normalizeDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (char) => DIGIT_MAP[char] ?? char);
}

type PersonalInfoActionResult = {
  ok: boolean;
  fieldErrors?: Partial<Record<keyof z.infer<typeof personalInfoSchema>, string>>;
  error?: string;
  data?: { avatarUrl: string };
};

type SkillsActionResult = {
  ok: boolean;
  error?: string;
};

type LanguagesActionResult = {
  ok: boolean;
  error?: string;
};

type AccentsActionResult = {
  ok: boolean;
  error?: string;
};

type DegreesActionResult = {
  ok: boolean;
  error?: string;
};

type ExperienceActionResult = {
  ok: boolean;
  error?: string;
};

type VideosActionResult = {
  ok: boolean;
  error?: string;
};

type VoicesActionResult = {
  ok: boolean;
  error?: string;
};

type GalleryActionResult = {
  ok: boolean;
  error?: string;
  url?: string;
};

type PublishActionResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof personalInfoSchema>, string>>;
};

async function ensureSessionUserId(): Promise<string> {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    throw new Error(AUTH_ERROR);
  }

  return session.user.id;
}

async function revalidateProfilePaths(profileId: string) {
  revalidatePath(`/profiles/${profileId}`);
  for (const path of DASHBOARD_PROFILE_PATHS) {
    revalidatePath(path);
  }
}

function mapZodErrors(
  error: z.ZodError<z.infer<typeof personalInfoSchema>>,
): Partial<Record<keyof z.infer<typeof personalInfoSchema>, string>> {
  const fieldErrors: Partial<
    Record<keyof z.infer<typeof personalInfoSchema>, string>
  > = {};

  for (const issue of error.issues) {
    const pathKey = issue.path[0];
    if (typeof pathKey === "string" && !(pathKey in fieldErrors)) {
      fieldErrors[pathKey as keyof z.infer<typeof personalInfoSchema>] =
        issue.message;
    }
  }

  return fieldErrors;
}

export async function upsertPersonalInfo(formData: FormData): Promise<PersonalInfoActionResult> {
  try {
    const userId = await ensureSessionUserId();

    const rawAvatarUrl = formData.get("avatarUrl");
    const avatarFile = formData.get("avatar");

    const baseValues = {
      firstName: (formData.get("firstName") ?? "").toString().trim(),
      lastName: (formData.get("lastName") ?? "").toString().trim(),
      stageName: (formData.get("stageName") ?? "").toString().trim(),
      age: formData.get("age") ?? "",
      phone: normalizeDigits((formData.get("phone") ?? "").toString().trim()),
      address: (formData.get("address") ?? "").toString().trim(),
      cityId: (formData.get("cityId") ?? "").toString().trim(),
      avatarUrl: typeof rawAvatarUrl === "string" ? rawAvatarUrl.trim() : "",
      bio: (formData.get("bio") ?? "").toString().trim(),
      introVideoMediaId: (formData.get("introVideoMediaId") ?? "").toString().trim(),
    } satisfies Record<keyof z.infer<typeof personalInfoSchema>, unknown>;

    let uploadedAvatarUrl: string | null = null;

    if (avatarFile instanceof File && avatarFile.size > 0) {
      const uploadForm = new FormData();
      uploadForm.set("file", avatarFile);
      const { url } = await saveImageFromFormData(uploadForm, userId);
      baseValues.avatarUrl = url;
      uploadedAvatarUrl = url;
    }

    const parsed = personalInfoSchema.safeParse(baseValues);

    if (!parsed.success) {
      if (uploadedAvatarUrl) {
        await deleteByUrl(uploadedAvatarUrl, userId);
      }
      return {
        ok: false,
        fieldErrors: mapZodErrors(parsed.error),
      };
    }

    const data = parsed.data;

    let introVideoMediaId: string | null = null;

    if (data.introVideoMediaId && data.introVideoMediaId.trim()) {
      const validation = await validateOwnedReadyVideo(userId, data.introVideoMediaId);
      if (!validation.ok) {
        return {
          ok: false,
          fieldErrors: { introVideoMediaId: validation.error },
        };
      }
      introVideoMediaId = validation.mediaId;
    }

    const previousProfile = await prisma.profile.findUnique({
      where: { userId },
      select: MODERATION_PROFILE_SELECT,
    });

    const result = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        firstName: data.firstName,
        lastName: data.lastName,
        stageName: data.stageName?.trim() ? data.stageName.trim() : null,
        age: data.age,
        phone: data.phone,
        address: data.address?.trim() ? data.address.trim() : null,
        cityId: data.cityId,
        avatarUrl: data.avatarUrl,
        bio: data.bio?.trim() ? data.bio.trim() : null,
        introVideoMediaId,
      },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        stageName: data.stageName?.trim() ? data.stageName.trim() : null,
        age: data.age,
        phone: data.phone,
        address: data.address?.trim() ? data.address.trim() : null,
        cityId: data.cityId,
        avatarUrl: data.avatarUrl,
        bio: data.bio?.trim() ? data.bio.trim() : null,
        introVideoMediaId,
      },
      select: MODERATION_PROFILE_SELECT,
    });

    await maybeMarkPendingOnCriticalEdit({ old: previousProfile, next: result });

    await revalidateProfilePaths(result.id);
    await enforceUserProfileVisibility(userId);

    return {
      ok: true,
      data: { avatarUrl: result.avatarUrl ?? "" },
    };
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_ERROR) {
      return { ok: false, error: AUTH_ERROR };
    }

    console.error("upsertPersonalInfo", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function updateSkills(formData: FormData): Promise<SkillsActionResult> {
  try {
    const userId = await ensureSessionUserId();
    const rawSkills = formData.getAll("skills").map((value) => value?.toString() ?? "");

    const parsed = skillsSchema.safeParse({ skills: rawSkills });

    if (!parsed.success) {
      return { ok: false, error: "لیست مهارت‌ها معتبر نیست." };
    }

    const previousProfile = await prisma.profile.findUnique({
      where: { userId },
      select: MODERATION_PROFILE_SELECT,
    });

    const result = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        skills: parsed.data.skills,
      },
      update: {
        skills: parsed.data.skills,
      },
      select: MODERATION_PROFILE_SELECT,
    });

    await maybeMarkPendingOnCriticalEdit({ old: previousProfile, next: result });

    await revalidateProfilePaths(result.id);
    await enforceUserProfileVisibility(userId);

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_ERROR) {
      return { ok: false, error: AUTH_ERROR };
    }

    console.error("updateSkills", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function updateLanguages(formData: FormData): Promise<LanguagesActionResult> {
  try {
    const userId = await ensureSessionUserId();
    const rawLanguages = formData.get("languages");

    if (typeof rawLanguages !== "string") {
      return { ok: false, error: "لطفاً زبان‌ها را بررسی کنید." };
    }

    let parsedLanguages: unknown;

    try {
      parsedLanguages = JSON.parse(rawLanguages);
    } catch {
      return { ok: false, error: "ساختار زبان‌ها معتبر نیست." };
    }

    const parsed = languagesSchema.safeParse(parsedLanguages);

    if (!parsed.success) {
      return {
        ok: false,
        error: "سطح زبان‌ها باید بین ۱ تا ۵ باشد.",
      };
    }

    const previousProfile = await prisma.profile.findUnique({
      where: { userId },
      select: MODERATION_PROFILE_SELECT,
    });

    const result = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        languages: parsed.data,
      },
      update: {
        languages: parsed.data,
      },
      select: MODERATION_PROFILE_SELECT,
    });

    await maybeMarkPendingOnCriticalEdit({ old: previousProfile, next: result });

    await revalidateProfilePaths(result.id);
    await enforceUserProfileVisibility(userId);

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_ERROR) {
      return { ok: false, error: AUTH_ERROR };
    }

    console.error("updateLanguages", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function updateAccents(formData: FormData): Promise<AccentsActionResult> {
  try {
    const userId = await ensureSessionUserId();
    const rawAccents = formData.get("accents");

    if (typeof rawAccents !== "string") {
      return { ok: false, error: "لطفاً لهجه‌ها را بررسی کنید." };
    }

    let parsedAccents: unknown;

    try {
      parsedAccents = JSON.parse(rawAccents);
    } catch {
      return { ok: false, error: "ساختار لهجه‌ها معتبر نیست." };
    }

    const parsed = accentsSchema.safeParse(parsedAccents);

    if (!parsed.success) {
      return {
        ok: false,
        error: "لطفاً لهجه‌ها را بررسی کنید.",
      };
    }

    const cleanedAccents =
      parsed.data?.map((item) => item.trim()).filter((value) => value.length > 0) ?? [];

    const previousProfile = await prisma.profile.findUnique({
      where: { userId },
      select: MODERATION_PROFILE_SELECT,
    });

    const result = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        accents: cleanedAccents.length > 0 ? cleanedAccents : Prisma.DbNull,
      },
      update: {
        accents: cleanedAccents.length > 0 ? cleanedAccents : Prisma.DbNull,
      },
      select: MODERATION_PROFILE_SELECT,
    });

    await maybeMarkPendingOnCriticalEdit({ old: previousProfile, next: result });

    await revalidateProfilePaths(result.id);
    await enforceUserProfileVisibility(userId);

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_ERROR) {
      return { ok: false, error: AUTH_ERROR };
    }

    console.error("updateAccents", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function updateDegrees(formData: FormData): Promise<DegreesActionResult> {
  try {
    const userId = await ensureSessionUserId();
    const raw = formData.get("degrees");

    if (typeof raw !== "string") {
      return { ok: false, error: "لطفاً مقاطع تحصیلی را بررسی کنید." };
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: "ساختار مقاطع تحصیلی معتبر نیست." };
    }

    const validated = degreesSchema.safeParse(parsed);
    if (!validated.success) {
      return { ok: false, error: "لطفاً مقاطع تحصیلی را بررسی کنید." };
    }

    const cleaned =
      validated.data?.map((d) => ({
        degreeLevel: d.degreeLevel.trim(),
        major: d.major.trim(),
      })) ?? [];

    const previous = await prisma.profile.findUnique({
      where: { userId },
      select: MODERATION_PROFILE_SELECT,
    });

    const result = await prisma.profile.upsert({
      where: { userId },
      create: { userId, degrees: cleaned.length ? cleaned : Prisma.DbNull },
      update: { degrees: cleaned.length ? cleaned : Prisma.DbNull },
      select: MODERATION_PROFILE_SELECT,
    });

    await maybeMarkPendingOnCriticalEdit({ old: previous, next: result });
    await revalidateProfilePaths(result.id);
    await enforceUserProfileVisibility(userId);

    return { ok: true };
  } catch (error) {
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function updateExperience(formData: FormData): Promise<ExperienceActionResult> {
  try {
    const userId = await ensureSessionUserId();
    const rawExperience = formData.get("experience");

    if (typeof rawExperience !== "string") {
      return { ok: false, error: "لطفاً اطلاعات تجربه را بررسی کنید." };
    }

    let parsedExperience: unknown;

    try {
      parsedExperience = JSON.parse(rawExperience);
    } catch {
      return { ok: false, error: "ساختار تجربه‌ها معتبر نیست." };
    }

    const parsed = experienceSchema.safeParse(parsedExperience);

    if (!parsed.success) {
      return {
        ok: false,
        error: "لطفاً نقش و نام اثر را برای همه موارد وارد کنید.",
      };
    }

    const previousProfile = await prisma.profile.findUnique({
      where: { userId },
      select: MODERATION_PROFILE_SELECT,
    });

    const result = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        experience: parsed.data,
      },
      update: {
        experience: parsed.data,
      },
      select: MODERATION_PROFILE_SELECT,
    });

    await maybeMarkPendingOnCriticalEdit({ old: previousProfile, next: result });

    await revalidateProfilePaths(result.id);
    await enforceUserProfileVisibility(userId);

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_ERROR) {
      return { ok: false, error: AUTH_ERROR };
    }

    console.error("updateExperience", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function updateVideos(formData: FormData): Promise<VideosActionResult> {
  try {
    const userId = await ensureSessionUserId();
    const raw = formData.get("videos");

    if (typeof raw !== "string") {
      return { ok: false, error: "لطفاً ویدئوها را بررسی کنید." };
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: "ساختار ویدئوها معتبر نیست." };
    }

    const validated = profileVideosSchema.safeParse(parsed);

    if (!validated.success) {
      return { ok: false, error: "لطفاً ویدئوها را بررسی کنید." };
    }

    const entries = Array.isArray(validated.data) ? validated.data : [];
    const cleaned: { mediaId: string; title?: string; order?: number }[] = [];
    const seen = new Set<string>();

    for (const [index, entry] of entries.entries()) {
      if (!entry || typeof entry.mediaId !== "string") {
        continue;
      }

      const mediaId = entry.mediaId.trim();

      if (!mediaId || seen.has(mediaId)) {
        continue;
      }

      const validation = await validateOwnedReadyVideo(userId, mediaId);

      if (!validation.ok) {
        return { ok: false, error: validation.error };
      }

      const title = entry.title?.trim();
      const order =
        typeof entry.order === "number" && Number.isInteger(entry.order)
          ? entry.order
          : undefined;

      cleaned.push({
        mediaId: validation.mediaId,
        title: title ? title : undefined,
        order: order ?? index,
      });
      seen.add(validation.mediaId);
    }

    const previousProfile = await prisma.profile.findUnique({
      where: { userId },
      select: MODERATION_PROFILE_SELECT,
    });

    const result = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        videos: cleaned.length > 0 ? cleaned : Prisma.DbNull,
      },
      update: {
        videos: cleaned.length > 0 ? cleaned : Prisma.DbNull,
      },
      select: MODERATION_PROFILE_SELECT,
    });

    await maybeMarkPendingOnCriticalEdit({ old: previousProfile, next: result });

    await revalidateProfilePaths(result.id);
    await enforceUserProfileVisibility(userId);

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_ERROR) {
      return { ok: false, error: AUTH_ERROR };
    }

    console.error("updateVideos", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function updateVoices(formData: FormData): Promise<VoicesActionResult> {
  try {
    const userId = await ensureSessionUserId();
    const raw = formData.get("voices");

    if (typeof raw !== "string") {
      return { ok: false, error: "لطفاً فایل‌های صوتی را بررسی کنید." };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: "ساختار فایل‌های صوتی معتبر نیست." };
    }

    const validated = voicesSchema.safeParse(parsed);

    if (!validated.success) {
      return { ok: false, error: "لطفاً فایل‌های صوتی را بررسی کنید." };
    }

    const cleaned =
      validated.data?.map((entry) => ({
        mediaId: entry.mediaId.trim(),
        url: entry.url.trim(),
        title: entry.title?.trim() || null,
        duration: typeof entry.duration === "number" ? entry.duration : null,
      })) ?? [];

    const previous = await prisma.profile.findUnique({
      where: { userId },
      select: MODERATION_PROFILE_SELECT,
    });

    const result = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        voices: cleaned.length ? cleaned : Prisma.DbNull,
      },
      update: {
        voices: cleaned.length ? cleaned : Prisma.DbNull,
      },
      select: MODERATION_PROFILE_SELECT,
    });

    await maybeMarkPendingOnCriticalEdit({ old: previous, next: result });
    await revalidateProfilePaths(result.id);
    await enforceUserProfileVisibility(userId);

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_ERROR) {
      return { ok: false, error: AUTH_ERROR };
    }

    console.error("updateVoices", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function uploadImage(formData: FormData): Promise<GalleryActionResult> {
  try {
    const userId = await ensureSessionUserId();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "لطفاً یک تصویر انتخاب کنید." };
    }

    const uploadForm = new FormData();
    uploadForm.set("file", file);
    const { url } = await saveImageFromFormData(uploadForm, userId);

    const previousProfile = await prisma.profile.findUnique({
      where: { userId },
      select: MODERATION_PROFILE_SELECT,
    });

    const currentGallery = Array.isArray(previousProfile?.gallery)
      ? (previousProfile?.gallery as Array<{ url: string }>)
      : [];

    const nextGallery = [...currentGallery, { url }];

    const result = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        gallery: nextGallery,
      },
      update: {
        gallery: nextGallery,
      },
      select: MODERATION_PROFILE_SELECT,
    });

    await maybeMarkPendingOnCriticalEdit({ old: previousProfile, next: result });

    await revalidateProfilePaths(result.id);

    return { ok: true, url };
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_ERROR) {
      return { ok: false, error: AUTH_ERROR };
    }

    console.error("uploadImage", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function deleteImage(formData: FormData): Promise<GalleryActionResult> {
  try {
    const userId = await ensureSessionUserId();
    const url = (formData.get("url") ?? "").toString();

    if (!url) {
      return { ok: false, error: "آدرس تصویر نامعتبر است." };
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: MODERATION_PROFILE_SELECT,
    });

    if (!profile) {
      return { ok: false, error: NO_PROFILE_ERROR };
    }

    const currentGallery = Array.isArray(profile.gallery)
      ? (profile.gallery as Array<{ url: string }>)
      : [];

    const nextGallery = currentGallery.filter((item) => item.url !== url);

    const updated = await prisma.profile.update({
      where: { userId },
      data: { gallery: nextGallery },
      select: MODERATION_PROFILE_SELECT,
    });

    await deleteByUrl(url, userId);
    await maybeMarkPendingOnCriticalEdit({ old: profile, next: updated });
    await revalidateProfilePaths(updated.id);

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_ERROR) {
      return { ok: false, error: AUTH_ERROR };
    }

    console.error("deleteImage", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function publishProfile(): Promise<PublishActionResult> {
  try {
    const userId = await ensureSessionUserId();
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        stageName: true,
        age: true,
        phone: true,
        address: true,
        cityId: true,
        avatarUrl: true,
        bio: true,
        introVideoMediaId: true,
        moderationStatus: true,
        moderationNotes: true,
        moderatedBy: true,
        moderatedAt: true,
      },
    });

    if (!profile) {
      return { ok: false, error: NO_PROFILE_ERROR };
    }

    const publishability = await getPublishability(userId);

    if (!publishability.canPublish) {
      return { ok: false, error: PUBLISH_ENTITLEMENT_ERROR };
    }

    const validationPayload = {
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      stageName: profile.stageName ?? "",
      age: profile.age ?? "",
      phone: normalizeDigits(profile.phone ?? ""),
      address: profile.address ?? "",
      cityId: profile.cityId ?? "",
      avatarUrl: profile.avatarUrl ?? "",
      bio: profile.bio ?? "",
      introVideoMediaId: profile.introVideoMediaId ?? "",
    };

    const parsed = personalInfoSchema.safeParse(validationPayload);

    if (!parsed.success) {
      return {
        ok: false,
        fieldErrors: mapZodErrors(parsed.error),
      };
    }

    const shouldResetModeration =
      !profile.moderationStatus || profile.moderationStatus === "REJECTED";

    await prisma.profile.update({
      where: { userId },
      data: {
        visibility: "PUBLIC",
        publishedAt: new Date(),
        moderationStatus: shouldResetModeration
          ? "PENDING"
          : profile.moderationStatus,
        ...(shouldResetModeration
          ? {
              moderatedBy: null,
              moderatedAt: null,
              moderationNotes: null,
            }
          : {}),
      },
    });

    await revalidateProfilePaths(profile.id);

    await emitUserPublishSubmitted(userId, profile.id);

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_ERROR) {
      return { ok: false, error: AUTH_ERROR };
    }

    console.error("publishProfile", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function unpublishProfile(): Promise<PublishActionResult> {
  try {
    const userId = await ensureSessionUserId();
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      return { ok: false, error: NO_PROFILE_ERROR };
    }

    await prisma.profile.update({
      where: { userId },
      data: {
        visibility: "PRIVATE",
        publishedAt: null,
      },
    });

    await revalidateProfilePaths(profile.id);

    await emitUserUnpublished(userId, profile.id);

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_ERROR) {
      return { ok: false, error: AUTH_ERROR };
    }

    console.error("unpublishProfile", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

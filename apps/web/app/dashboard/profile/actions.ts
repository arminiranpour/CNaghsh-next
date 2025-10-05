"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { canPublishProfile } from "@/lib/profile/entitlement";
import { personalInfoSchema, skillsSchema } from "@/lib/profile/validation";
import { deleteByUrl, saveImageFromFormData } from "@/lib/media/storage";

const GENERIC_ERROR = "خطایی رخ داد. لطفاً دوباره تلاش کنید.";
const AUTH_ERROR = "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.";
const NO_PROFILE_ERROR = "ابتدا اطلاعات پروفایل خود را تکمیل کنید.";
const PUBLISH_ENTITLEMENT_ERROR = "برای انتشار پروفایل نیاز به اشتراک فعال دارید.";

const DASHBOARD_PROFILE_PATHS = [
  "/dashboard/profile",
  "/profiles",
];

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
      phone: (formData.get("phone") ?? "").toString().trim(),
      address: (formData.get("address") ?? "").toString().trim(),
      cityId: (formData.get("cityId") ?? "").toString().trim(),
      avatarUrl: typeof rawAvatarUrl === "string" ? rawAvatarUrl.trim() : "",
      bio: (formData.get("bio") ?? "").toString().trim(),
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
      },
      select: {
        id: true,
        avatarUrl: true,
      },
    });

    await revalidateProfilePaths(result.id);

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

    const result = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        skills: parsed.data.skills,
      },
      update: {
        skills: parsed.data.skills,
      },
      select: { id: true },
    });

    await revalidateProfilePaths(result.id);

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_ERROR) {
      return { ok: false, error: AUTH_ERROR };
    }

    console.error("updateSkills", error);
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

    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, gallery: true },
    });

    const currentGallery = Array.isArray(profile?.gallery)
      ? (profile?.gallery as Array<{ url: string }>)
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
      select: { id: true },
    });

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
      select: { id: true, gallery: true },
    });

    if (!profile) {
      return { ok: false, error: NO_PROFILE_ERROR };
    }

    const currentGallery = Array.isArray(profile.gallery)
      ? (profile.gallery as Array<{ url: string }>)
      : [];

    const nextGallery = currentGallery.filter((item) => item.url !== url);

    await prisma.profile.update({
      where: { userId },
      data: { gallery: nextGallery },
    });

    await deleteByUrl(url, userId);
    await revalidateProfilePaths(profile.id);

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
      },
    });

    if (!profile) {
      return { ok: false, error: NO_PROFILE_ERROR };
    }

    const entitlement = await canPublishProfile(userId);

    if (!entitlement) {
      return { ok: false, error: PUBLISH_ENTITLEMENT_ERROR };
    }

    const validationPayload = {
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      stageName: profile.stageName ?? "",
      age: profile.age ?? "",
      phone: profile.phone ?? "",
      address: profile.address ?? "",
      cityId: profile.cityId ?? "",
      avatarUrl: profile.avatarUrl ?? "",
      bio: profile.bio ?? "",
    };

    const parsed = personalInfoSchema.safeParse(validationPayload);

    if (!parsed.success) {
      return {
        ok: false,
        fieldErrors: mapZodErrors(parsed.error),
      };
    }

    await prisma.profile.update({
      where: { userId },
      data: {
        visibility: "PUBLIC",
        publishedAt: new Date(),
      },
    });

    await revalidateProfilePaths(profile.id);

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

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_ERROR) {
      return { ok: false, error: AUTH_ERROR };
    }

    console.error("unpublishProfile", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

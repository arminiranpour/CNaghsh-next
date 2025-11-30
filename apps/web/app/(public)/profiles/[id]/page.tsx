import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { MediaAsset, Prisma } from "@prisma/client";

import { iransans } from "@/app/fonts";
import {
  ProfilePageClient,
  type ProfileVideoData,
  type PublicProfileData,
} from "@/components/profile/ProfilePageClient";
import { ProfilePageLayout } from "@/components/profile/ProfilePageLayout";
import { getServerAuthSession } from "@/lib/auth/session";
import { getCities } from "@/lib/location/cities";
import { prisma } from "@/lib/prisma";
import { getPlaybackInfoForMedia } from "@/lib/media/urls";
import { normalizeLanguageSkills } from "@/lib/profile/languages";
import { SKILLS, type SkillKey } from "@/lib/profile/skills";

type PageProps = { params: { id: string } };
type ProfileWithRelations = Prisma.ProfileGetPayload<{
  include: { awards: true };
}>;

const SKILL_LABELS = new Map(SKILLS.map((skill) => [skill.key, skill.label] as const));

function getDisplayName(
  stageName?: string | null,
  firstName?: string | null,
  lastName?: string | null,
): string {
  if (stageName && stageName.trim()) {
    return stageName.trim();
  }

  const combined = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return combined || "پروفایل بدون نام";
}

function normalizeSkills(raw: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const skills: string[] = [];

  for (const entry of raw) {
    if (typeof entry === "string") {
      const label = SKILL_LABELS.get(entry as SkillKey) ?? entry;
      skills.push(label);
    }
  }

  return skills;
}

function normalizeGallery(raw: Prisma.JsonValue | null | undefined): { url: string }[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const images: { url: string }[] = [];

  for (const entry of raw) {
    if (entry && typeof entry === "object" && "url" in entry && typeof entry.url === "string") {
      images.push({ url: entry.url });
    }
  }

  return images;
}

function normalizeLanguages(raw: Prisma.JsonValue | null | undefined) {
  return normalizeLanguageSkills(raw);
}

function normalizeAccents(raw: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(raw)) return [];

  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (typeof item !== "string") {
      continue;
    }

    const cleaned = item.trim();
    if (!cleaned) {
      continue;
    }

    const dedupeKey = cleaned.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    result.push(cleaned);
  }

  return result;
}

function normalizeDegrees(
  raw: Prisma.JsonValue | null | undefined,
): { degreeLevel: string; major: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item: any) => ({
      degreeLevel: String(item.degreeLevel ?? "").trim(),
      major: String(item.major ?? "").trim(),
    }))
    .filter((entry) => entry.degreeLevel || entry.major);
}

function collectVideoMediaIds(raw: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const ids: string[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const mediaId =
      typeof (item as { mediaId?: unknown }).mediaId === "string"
        ? ((item as { mediaId?: string }).mediaId ?? "").trim()
        : "";

    if (!mediaId || seen.has(mediaId)) {
      continue;
    }

    seen.add(mediaId);
    ids.push(mediaId);
  }

  return ids;
}

function normalizeVideos(
  videosRaw: Prisma.JsonValue | null | undefined,
  mediaById: Map<string, MediaAsset>,
): ProfileVideoData[] {
  if (!Array.isArray(videosRaw)) {
    return [];
  }

  const parsed: Array<{
    mediaId: string;
    title?: string;
    order?: number;
    index: number;
  }> = [];

  for (const item of videosRaw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const mediaId =
      typeof (item as { mediaId?: unknown }).mediaId === "string"
        ? ((item as { mediaId?: string }).mediaId ?? "").trim()
        : "";

    if (!mediaId) {
      continue;
    }

    const rawTitle = (item as { title?: unknown }).title;
    const rawOrder = (item as { order?: unknown }).order;

    const title = typeof rawTitle === "string" ? rawTitle.trim() : undefined;
    const order =
      typeof rawOrder === "number" && Number.isInteger(rawOrder) ? rawOrder : undefined;

    parsed.push({
      mediaId,
      title: title || undefined,
      order: order ?? undefined,
      index: parsed.length,
    });
  }

  const result: ProfileVideoData[] = [];

  parsed
    .sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.index - b.index;
    })
    .forEach((entry) => {
      const media = mediaById.get(entry.mediaId);

      if (!media) {
        return;
      }

      try {
        const playback = getPlaybackInfoForMedia(media);
        result.push({
          mediaId: entry.mediaId,
          url: playback.manifestUrl,
          posterUrl: playback.posterUrl,
          title: entry.title,
          playbackKind: playback.kind,
        });
      } catch (error) {
        console.warn("[profile] failed to build playback for video", {
          mediaId: entry.mediaId,
          error,
        });
      }
    });

  return result;
}

function normalizeVoices(
  raw: Prisma.JsonValue | null | undefined,
): { mediaId: string; url: string; title?: string | null; duration?: number | null }[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => item && typeof item === "object")
    .map((item: any) => ({
      mediaId: String(item.mediaId ?? "").trim(),
      url: String(item.url ?? "").trim(),
      title: item.title ? String(item.title).trim() : null,
      duration:
        typeof item.duration === "number" && Number.isFinite(item.duration)
          ? item.duration
          : null,
    }))
    .filter((entry) => entry.mediaId && entry.url);
}

function normalizeAwards(
  raw: ProfileWithRelations["awards"] | null | undefined,
): PublicProfileData["awards"] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((award) => ({
      id: award.id,
      title: (award.title ?? "").trim(),
      place: award.place?.trim() || null,
      awardDate: award.awardDate?.trim() || null,
    }))
    .filter((award) => award.title);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const profile = await prisma.profile.findUnique({
    where: { id: params.id },
    select: {
      firstName: true,
      lastName: true,
      stageName: true,
    },
  });

  if (!profile) {
    return {
      title: "پروفایل | سی‌نقش",
      description: "مشاهده پروفایل در سی‌نقش",
    };
  }

  const displayName = getDisplayName(profile.stageName, profile.firstName, profile.lastName);

  return {
    title: `${displayName} | سی‌نقش`,
    description: `مشاهده پروفایل ${displayName} در سی‌نقش`,
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const [profile, session, cities] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: params.id },
      include: {
        awards: {
          orderBy: [
            { awardDate: "desc" },
            { createdAt: "desc" },
          ],
        },
      },
    }),
    getServerAuthSession(),
    getCities(),
  ]);

  if (
    !profile ||
    profile.visibility !== "PUBLIC" ||
    profile.moderationStatus !== "APPROVED" ||
    !profile.publishedAt
  ) {
    notFound();
  }

  const videoMediaIds = collectVideoMediaIds(profile.videos);

  const videoMedia = videoMediaIds.length
    ? await prisma.mediaAsset.findMany({
        where: {
          id: { in: videoMediaIds },
          status: "ready",
          type: "video",
          visibility: "public",
          outputKey: { not: null },
        },
      })
    : [];

  const mediaById = new Map(videoMedia.map((media) => [media.id, media] as const));

  const cityMap = new Map(cities.map((city) => [city.id, city.name] as const));

  const videos = normalizeVideos(profile.videos, mediaById);
  const voices = normalizeVoices(profile.voices);
  const awards = normalizeAwards(profile.awards);

  const profileData: PublicProfileData = {
    id: profile.id,
    userId: profile.userId,
    displayName: getDisplayName(profile.stageName, profile.firstName, profile.lastName),
    avatarUrl: profile.avatarUrl,
    age: profile.age,
    bio: profile.bio,
    cityName: profile.cityId ? cityMap.get(profile.cityId) ?? undefined : undefined,
    skills: normalizeSkills(profile.skills),
    languages: normalizeLanguages(profile.languages),
    accents: normalizeAccents(profile.accents),
    degrees: normalizeDegrees(profile.degrees),
    gallery: normalizeGallery(profile.gallery),
    experience: profile.experience ?? null,
    voices,
    videos,
    awards,
  };

  const isOwner = session?.user?.id === profile.userId;

  return (
    <div className={iransans.className}>
      <ProfilePageLayout>
        <ProfilePageClient
          profile={profileData}
          isOwner={isOwner}
          sessionUserId={session?.user?.id}
        />
      </ProfilePageLayout>
    </div>
  );
}

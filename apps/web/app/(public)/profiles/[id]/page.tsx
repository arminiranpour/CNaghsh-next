import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";

import { iransans } from "@/app/fonts";
import { ProfilePageClient, type PublicProfileData } from "@/components/profile/ProfilePageClient";
import { ProfilePageLayout } from "@/components/profile/ProfilePageLayout";
import { getServerAuthSession } from "@/lib/auth/session";
import { getCities } from "@/lib/location/cities";
import { prisma } from "@/lib/prisma";
import { SKILLS, type SkillKey } from "@/lib/profile/skills";

type PageProps = { params: { id: string } };

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

  const cityMap = new Map(cities.map((city) => [city.id, city.name] as const));
  const profileData: PublicProfileData = {
    id: profile.id,
    userId: profile.userId,
    displayName: getDisplayName(profile.stageName, profile.firstName, profile.lastName),
    avatarUrl: profile.avatarUrl,
    age: profile.age,
    bio: profile.bio,
    cityName: profile.cityId ? cityMap.get(profile.cityId) ?? undefined : undefined,
    skills: normalizeSkills(profile.skills),
    gallery: normalizeGallery(profile.gallery),
  };

  const isOwner = session?.user?.id === profile.userId;

  return (
    <div className={iransans.className}>
      <ProfilePageLayout>
        <ProfilePageClient profile={profileData} isOwner={isOwner} />
      </ProfilePageLayout>
    </div>
  );
}

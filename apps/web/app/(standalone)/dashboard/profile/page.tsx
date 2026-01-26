import { redirect } from "next/navigation";

import type { PublicProfileData } from "@/components/profile/ProfilePageClient";
import { ProfilePageLayout } from "@/components/profile/ProfilePageLayout";
import { iransans } from "@/app/fonts";
import { getServerAuthSession } from "@/lib/auth/session";
import { getCities, getProvinces } from "@/lib/location/cities";
import { prisma } from "@/lib/prisma";
import { canPublishProfile } from "@/lib/profile/entitlement";
import { enforceUserProfileVisibility } from "@/lib/profile/enforcement";
import {
  buildProfilePageData,
  getDisplayName,
} from "@/lib/profile/profile-page-data";
import {
  normalizeAccentEntries,
  normalizeDegreeEntries,
  normalizeLanguageEntries,
  normalizePortfolioExperience,
  normalizeSkillKeys,
  type PortfolioEditInitialValues,
} from "@/lib/profile/portfolio-edit";

import { DashboardProfileClient } from "./_components/dashboard-profile-client";

export default async function DashboardProfilePage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/auth?tab=signin");
  }

  const userId = session.user.id;

  const [initialProfile, cities, entitlementActive] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      include: {
        awards: {
          orderBy: [
            { awardDate: "desc" },
            { createdAt: "desc" },
          ],
        },
      },
    }),
    getCities(),
    canPublishProfile(userId),
  ]);

  const provinces = getProvinces().map((province) => ({
    id: String(province.id),
    name: province.name,
  }));

  let profile = initialProfile;

  if (profile?.visibility === "PUBLIC" && !entitlementActive) {
    const enforcementResult = await enforceUserProfileVisibility(userId);

    if (enforcementResult === "auto_unpublished") {
      profile = await prisma.profile.findUnique({
        where: { userId },
        include: {
          awards: {
            orderBy: [
              { awardDate: "desc" },
              { createdAt: "desc" },
            ],
          },
        },
      });
    }
  }

  const profileData: PublicProfileData = profile
    ? await buildProfilePageData(profile, cities)
    : {
        id: "draft",
        userId,
        displayName: getDisplayName(undefined, undefined, undefined),
        avatarUrl: null,
        age: null,
        bio: null,
        cityName: undefined,
        skills: [],
        languages: [],
        accents: [],
        degrees: [],
        gallery: [],
        experience: null,
        voices: [],
        videos: [],
        awards: [],
      };

  const portfolioExperience = normalizePortfolioExperience(profile?.experience ?? null);

  const portfolioInitialValues: PortfolioEditInitialValues = {
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    birthDate: profile?.birthDate ? profile.birthDate.toISOString().slice(0, 10) : "",
    cityId: profile?.cityId ?? "",
    bio: profile?.bio ?? "",
    skills: normalizeSkillKeys(profile?.skills ?? null),
    languages: normalizeLanguageEntries(profile?.languages ?? null),
    accents: normalizeAccentEntries(profile?.accents ?? null),
    voices: profileData.voices ?? [],
    degrees: normalizeDegreeEntries(profile?.degrees ?? null),
    resume: portfolioExperience.resume,
    courses: portfolioExperience.courses,
    experienceBase: {
      theatre: portfolioExperience.theatre,
      shortFilm: portfolioExperience.shortFilm,
      cinema: portfolioExperience.cinema,
      tv: portfolioExperience.tv,
    },
    avatarUrl: profile?.avatarUrl ?? "",
    stageName: profile?.stageName ?? "",
    age: profile?.age ?? null,
    phone: profile?.phone ?? "",
    address: profile?.address ?? "",
    introVideoMediaId: profile?.introVideoMediaId ?? "",
    gallery: profileData.gallery ?? [],
  };

  const isOwner = session.user.id === profileData.userId;

  return (
    <div className={iransans.className}>
      <ProfilePageLayout>
        <DashboardProfileClient
          profile={profileData}
          isOwner={isOwner}
          initialValues={portfolioInitialValues}
          cities={cities}
          provinces={provinces}
        />
      </ProfilePageLayout>
    </div>
  );
}

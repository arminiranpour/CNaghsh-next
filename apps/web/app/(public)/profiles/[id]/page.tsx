import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { iransans } from "@/app/fonts";
import {
  ProfilePageClient,
  type PublicProfileData,
} from "@/components/profile/ProfilePageClient";
import { ProfilePageLayout } from "@/components/profile/ProfilePageLayout";
import { getServerAuthSession } from "@/lib/auth/session";
import { getCities } from "@/lib/location/cities";
import { prisma } from "@/lib/prisma";
import { buildProfilePageData, getDisplayName } from "@/lib/profile/profile-page-data";

type PageProps = { params: { id: string } };
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

  const profileData: PublicProfileData = await buildProfilePageData(profile, cities);

  const isOwner = session?.user?.id === profile.userId;

  return (
    <div className={iransans.className}>
      <ProfilePageLayout>
        <ProfilePageClient profile={profileData} isOwner={isOwner} />
      </ProfilePageLayout>
    </div>
  );
}

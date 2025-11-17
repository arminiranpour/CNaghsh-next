import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerAuthSession } from "@/lib/auth/session";
import { getCities } from "@/lib/location/cities";
import { prisma } from "@/lib/prisma";
import { canPublishProfile } from "@/lib/profile/entitlement";
import { enforceUserProfileVisibility } from "@/lib/profile/enforcement";
import { SKILLS, type SkillKey } from "@/lib/profile/skills";
import { validateReadyToPublish } from "@/lib/profile/validation";

import { MediaGallery } from "./_components/media-gallery";
import { PersonalInfoForm } from "./_components/personal-info-form";
import { PublishPanel } from "./_components/publish-panel";
import { PublishStatusBanner } from "./_components/publish-status-banner";
import { SkillsForm } from "./_components/skills-form";

type GalleryEntry = {
  url?: unknown;
  width?: unknown;
  height?: unknown;
};

type PrismaProfile = NonNullable<Awaited<ReturnType<typeof prisma.profile.findUnique>>>;

function normalizeGallery(
  gallery: PrismaProfile["gallery"] | null | undefined,
): { url: string }[] {
  if (!Array.isArray(gallery)) {
    return [];
  }

  const images: { url: string }[] = [];

  for (const item of gallery as GalleryEntry[]) {
    if (item && typeof item === "object" && typeof item.url === "string") {
      images.push({ url: item.url });
    }
  }

  return images;
}

function normalizeSkills(
  skills: PrismaProfile["skills"] | null | undefined,
): SkillKey[] {
  if (!Array.isArray(skills)) {
    return [];
  }

  const allowed = new Set(SKILLS.map((skill) => skill.key));
  const result: SkillKey[] = [];

  for (const entry of skills) {
    if (typeof entry === "string" && allowed.has(entry as SkillKey)) {
      result.push(entry as SkillKey);
    }
  }

  return result;
}

export default async function DashboardProfilePage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const userId = session.user.id;

  const [initialProfile, cities, entitlementActive] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
    }),
    getCities(),
    canPublishProfile(userId),
  ]);

    let profile = initialProfile;

  if (profile?.visibility === "PUBLIC" && !entitlementActive) {
    const enforcementResult = await enforceUserProfileVisibility(userId);

    if (enforcementResult === "auto_unpublished") {
      profile = await prisma.profile.findUnique({
        where: { userId },
      });
    }
  }

  const cityMap = new Map(cities.map((city) => [city.id, city.name] as const));

  const galleryImages = normalizeGallery(profile?.gallery ?? null);
  const selectedSkills = normalizeSkills(profile?.skills ?? null);
  const cityName = profile?.cityId ? cityMap.get(profile.cityId) ?? undefined : undefined;

  const readinessResult = profile
    ? validateReadyToPublish({
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
        stageName: profile.stageName ?? "",
        age: profile.age ?? "",
        phone: profile.phone ?? "",
        address: profile.address ?? "",
        cityId: profile.cityId ?? "",
        avatarUrl: profile.avatarUrl ?? "",
        bio: profile.bio ?? "",
        introVideoMediaId: profile.introVideoMediaId ?? "",
      })
    : null;

  const readinessIssues = readinessResult
    ? readinessResult.success
      ? []
      : readinessResult.error.issues.map((issue) => issue.message)
    : ["لطفاً اطلاعات فردی خود را تکمیل کنید."];

  const isPublished = profile?.visibility === "PUBLIC";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6" dir="rtl">
      <PublishStatusBanner canPublish={entitlementActive} isPublished={isPublished ?? false} />

      <Card>
        <CardHeader>
          <CardTitle>اطلاعات فردی</CardTitle>
          <CardDescription>
            برای انتشار پروفایل، تکمیل همه فیلدهای این بخش الزامی است.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PersonalInfoForm
            cities={cities}
            initialValues={{
              firstName: profile?.firstName ?? "",
              lastName: profile?.lastName ?? "",
              stageName: profile?.stageName ?? "",
              age: profile?.age ?? null,
              phone: profile?.phone ?? "",
              address: profile?.address ?? "",
              cityId: profile?.cityId ?? "",
              avatarUrl: profile?.avatarUrl ?? "",
              bio: profile?.bio ?? "",
              introVideoMediaId: profile?.introVideoMediaId ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>مهارت‌ها</CardTitle>
          <CardDescription>انتخاب مهارت‌ها اختیاری است اما به کشف بهتر شما کمک می‌کند.</CardDescription>
        </CardHeader>
        <CardContent>
          <SkillsForm initialSkills={selectedSkills} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>رسانه‌ها</CardTitle>
          <CardDescription>تصاویر مرتبط با فعالیت‌های هنری خود را در این بخش بارگذاری کنید.</CardDescription>
        </CardHeader>
        <CardContent>
          <MediaGallery images={galleryImages} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>پیش‌نمایش و انتشار</CardTitle>
          <CardDescription>پیش از انتشار وضعیت پروفایل خود را بررسی کنید.</CardDescription>
        </CardHeader>
        <CardContent>
          <PublishPanel
            canPublish={entitlementActive}
            isPublished={isPublished ?? false}
            readinessIssues={readinessIssues}
            personalInfo={{
              firstName: profile?.firstName ?? "",
              lastName: profile?.lastName ?? "",
              stageName: profile?.stageName ?? "",
              age: profile?.age ?? null,
              phone: profile?.phone ?? "",
              address: profile?.address ?? "",
              cityName,
              bio: profile?.bio ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

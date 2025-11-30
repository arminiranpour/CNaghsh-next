import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Prisma } from "@prisma/client";
import { getServerAuthSession } from "@/lib/auth/session";
import { getCities } from "@/lib/location/cities";
import { prisma } from "@/lib/prisma";
import { normalizeLanguageSkills, type LanguageSkill } from "@/lib/profile/languages";
import { canPublishProfile } from "@/lib/profile/entitlement";
import { enforceUserProfileVisibility } from "@/lib/profile/enforcement";
import { SKILLS, type SkillKey } from "@/lib/profile/skills";
import { validateReadyToPublish } from "@/lib/profile/validation";

import { AccentsForm } from "./_components/accents-form";
import { ExperienceForm, type ExperienceFormValues } from "./_components/experience-form";
import { DegreesForm } from "./_components/degrees-form";
import { LanguagesForm } from "./_components/languages-form";
import { MediaGallery } from "./_components/media-gallery";
import { VideosForm } from "./_components/videos-form";
import { VoicesForm } from "./_components/voices-form";
import { PersonalInfoForm } from "./_components/personal-info-form";
import { PublishPanel } from "./_components/publish-panel";
import { PublishStatusBanner } from "./_components/publish-status-banner";
import { SkillsForm } from "./_components/skills-form";
import { AwardsForm, type AwardEntry } from "./_components/awards-form";

type GalleryEntry = {
  url?: unknown;
  width?: unknown;
  height?: unknown;
};

type PrismaProfile = Prisma.ProfileGetPayload<{
  include: { awards: true };
}>;

const isJsonRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
};

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

function normalizeLanguages(
  languages: PrismaProfile["languages"] | null | undefined,
): LanguageSkill[] {
  return normalizeLanguageSkills(languages);
}

function normalizeDegrees(
  raw: Prisma.JsonValue | null | undefined,
): { degreeLevel: string; major: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isJsonRecord)
    .map((item) => {
      const entry = item as { degreeLevel?: unknown; major?: unknown };
      return {
        degreeLevel: String(entry.degreeLevel ?? "").trim(),
        major: String(entry.major ?? "").trim(),
      };
    })
    .filter((entry) => entry.degreeLevel || entry.major);
}

function normalizeVideos(
  raw: Prisma.JsonValue | null | undefined,
): { mediaId: string; title?: string; order?: number }[] {
  if (!Array.isArray(raw)) return [];

  const entries: Array<{ mediaId: string; title?: string; order?: number; index: number }> = [];
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

    const rawTitle = (item as { title?: unknown }).title;
    const rawOrder = (item as { order?: unknown }).order;
    const title = typeof rawTitle === "string" ? rawTitle.trim() : undefined;
    const order =
      typeof rawOrder === "number" && Number.isInteger(rawOrder) ? rawOrder : undefined;

    entries.push({
      mediaId,
      title: title ? title : undefined,
      order: order ?? undefined,
      index: entries.length,
    });
    seen.add(mediaId);
  }

  return entries
    .sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.index - b.index;
    })
    .map(({ mediaId, title, order }) => ({
      mediaId,
      title,
      order,
    }));
}

function normalizeVoices(
  raw: Prisma.JsonValue | null | undefined,
): { mediaId: string; url: string; title?: string | null; duration?: number | null }[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(isJsonRecord)
    .map((item) => {
      const voice = item as {
        mediaId?: unknown;
        url?: unknown;
        title?: unknown;
        duration?: unknown;
      };
      return {
        mediaId: String(voice.mediaId ?? "").trim(),
        url: String(voice.url ?? "").trim(),
        title: voice.title ? String(voice.title).trim() : null,
        duration:
          typeof voice.duration === "number" && Number.isFinite(voice.duration)
            ? voice.duration
            : null,
      };
    })
    .filter((entry) => entry.mediaId && entry.url);
}

function normalizeAwards(
  raw: PrismaProfile["awards"] | null | undefined,
): AwardEntry[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((award) => ({
      id: award.id,
      title: (award.title ?? "").trim(),
      place: award.place?.trim() || "",
      date: award.awardDate?.trim() || "",
    }))
    .filter((award) => award.title);
}

function normalizeAccents(
  accents: PrismaProfile["accents"] | null | undefined,
): string[] {
  if (!Array.isArray(accents)) {
    return [];
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const entry of accents) {
    if (typeof entry !== "string") {
      continue;
    }

    const cleaned = entry.trim();

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

function normalizeExperience(
  experience: PrismaProfile["experience"] | null | undefined,
): ExperienceFormValues {
  const empty: ExperienceFormValues = {
    theatre: [],
    shortFilm: [],
    cinema: [],
    tv: [],
  };

  if (!experience || typeof experience !== "object" || Array.isArray(experience)) {
    return empty;
  }

  const parseCategory = (value: unknown): ExperienceFormValues[keyof ExperienceFormValues] => {
    if (!Array.isArray(value)) {
      return [];
    }

    const entries: ExperienceFormValues[keyof ExperienceFormValues] = [];

    for (const item of value) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const role =
          typeof (item as { role?: unknown }).role === "string"
            ? ((item as { role?: string }).role ?? "").trim()
            : "";
        const work =
          typeof (item as { work?: unknown }).work === "string"
            ? ((item as { work?: string }).work ?? "").trim()
            : "";

        if (role || work) {
          entries.push({ role, work });
        }
      }
    }

    return entries;
  };

  const data = experience as Record<string, unknown>;

  return {
    theatre: parseCategory(data.theatre),
    shortFilm: parseCategory(data.shortFilm),
    cinema: parseCategory(data.cinema),
    tv: parseCategory(data.tv),
  };
}

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

  const cityMap = new Map(cities.map((city) => [city.id, city.name] as const));

  const galleryImages = normalizeGallery(profile?.gallery ?? null);
  const selectedSkills = normalizeSkills(profile?.skills ?? null);
  const languages = normalizeLanguages(profile?.languages ?? null);
  const accents = normalizeAccents(profile?.accents ?? null);
  const degrees = normalizeDegrees(profile?.degrees ?? null);
  const videos = normalizeVideos(profile?.videos ?? null);
  const voices = normalizeVoices(profile?.voices ?? null);
  const awards = normalizeAwards(profile?.awards ?? null);
  const experience = normalizeExperience(profile?.experience ?? null);
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
          <CardTitle>زبان‌ها</CardTitle>
          <CardDescription>سطح تسلط خود را در هر زبان مشخص کنید.</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguagesForm initialLanguages={languages} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>لهجه‌ها</CardTitle>
          <CardDescription>لهجه‌های خود را اضافه یا ویرایش کنید.</CardDescription>
        </CardHeader>
        <CardContent>
          <AccentsForm initialAccents={accents} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تحصیلات</CardTitle>
          <CardDescription>مقطع و رشته تحصیلی خود را ثبت کنید.</CardDescription>
        </CardHeader>
        <CardContent>
          <DegreesForm initialDegrees={degrees} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ویدئوها</CardTitle>
          <CardDescription>ویدئوهای مربوط به خود را بارگذاری و مدیریت کنید.</CardDescription>
        </CardHeader>
        <CardContent>
          <VideosForm initialVideos={videos} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>فایل‌های صوتی</CardTitle>
          <CardDescription>فایل‌های صوتی خود را اضافه یا حذف کنید.</CardDescription>
        </CardHeader>
        <CardContent>
          <VoicesForm initialVoices={voices} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>جوایز و افتخارات</CardTitle>
          <CardDescription>
            عنوان جایزه، محل دریافت و تاریخ آن را ثبت یا ویرایش کنید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AwardsForm initialAwards={awards} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تجربه‌ها</CardTitle>
          <CardDescription>
            نقش‌ها و نام آثار را در چهار بخش تئاتر، فیلم کوتاه، سینمایی و تلویزیون ثبت کنید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExperienceForm initialValues={experience} />
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

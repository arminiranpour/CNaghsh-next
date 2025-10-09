import Image from "next/image";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/JsonLd";
import { Card, CardContent } from "@/components/ui/card";
import { getCities } from "@/lib/location/cities";
import { prisma } from "@/lib/prisma";
import { SKILLS, type SkillKey } from "@/lib/profile/skills";
import { SITE_LOCALE, SITE_NAME } from "@/lib/seo/constants";
import { getBaseUrl } from "@/lib/seo/baseUrl";
import { breadcrumbsJsonLd, profilePersonJsonLd } from "@/lib/seo/jsonld";

import type { Metadata } from "next";

export const revalidate = 300;

type GalleryEntry = {
  url?: unknown;
  width?: unknown;
  height?: unknown;
};

type SocialLinks = Record<string, unknown> | null | undefined;

type Props = {
  params: {
    id: string;
  };
};

const SKILL_LABELS = new Map(SKILLS.map((skill) => [skill.key, skill.label] as const));

function normalizeGallery(gallery: unknown): { url: string }[] {
  if (!Array.isArray(gallery)) {
    return [];
  }

  const images: { url: string }[] = [];
  for (const entry of gallery as GalleryEntry[]) {
    if (entry && typeof entry === "object" && typeof entry.url === "string") {
      images.push({ url: entry.url });
    }
  }
  return images;
}

function normalizeSkills(skills: unknown): string[] {
  if (!Array.isArray(skills)) {
    return [];
  }

  const labels: string[] = [];
  for (const entry of skills) {
    if (typeof entry === "string" && SKILL_LABELS.has(entry as SkillKey)) {
      labels.push(SKILL_LABELS.get(entry as SkillKey) ?? entry);
    }
  }
  return labels;
}

function extractSocialLinks(raw: SocialLinks): string[] {
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const links: string[] = [];
  for (const value of Object.values(raw)) {
    if (typeof value === "string" && value.trim().startsWith("http")) {
      links.push(value.trim());
    }
  }
  return links;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await prisma.profile.findUnique({
    where: { id: params.id },
    select: {
      visibility: true,
      moderationStatus: true,
      publishedAt: true,
      stageName: true,
      firstName: true,
      lastName: true,
      bio: true,
      avatarUrl: true,
    },
  });

  if (
    !profile ||
    profile.visibility !== "PUBLIC" ||
    profile.moderationStatus !== "APPROVED" ||
    !profile.publishedAt
  ) {
    return {};
  }

  const canonical = `${getBaseUrl()}/profiles/${params.id}`;
  const displayName = profile.stageName?.trim()
    ? profile.stageName
    : `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();
  const title = displayName ? `${displayName} | ${SITE_NAME}` : "پروفایل هنرمند";
  const description = profile.bio ?? undefined;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      images: profile.avatarUrl ? [profile.avatarUrl] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: profile.avatarUrl ? [profile.avatarUrl] : undefined,
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const profile = await prisma.profile.findUnique({
    where: { id: params.id },
  });

  if (!profile) {
    notFound();
  }

  if (
    profile.visibility !== "PUBLIC" ||
    profile.moderationStatus !== "APPROVED" ||
    !profile.publishedAt
  ) {
    notFound();
  }

  const [cities, socialLinks] = await Promise.all([
    getCities(),
    Promise.resolve(extractSocialLinks(profile.socialLinks as SocialLinks)),
  ]);

  const cityMap = new Map(cities.map((city) => [city.id, city.name] as const));
  const gallery = normalizeGallery(profile.gallery);
  const skills = normalizeSkills(profile.skills);
  const cityName = profile.cityId ? cityMap.get(profile.cityId) ?? profile.cityId : undefined;

  const displayName = profile.stageName?.trim()
    ? profile.stageName.trim()
    : `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "پروفایل";

  const baseUrl = getBaseUrl();
  const profileUrl = `${baseUrl}/profiles/${profile.id}`;
  const breadcrumbs = breadcrumbsJsonLd([
    { name: "خانه", item: `${baseUrl}/` },
    { name: "پروفایل‌ها", item: `${baseUrl}/profiles` },
    { name: displayName, item: profileUrl },
  ]);
  const personJsonLd = profilePersonJsonLd({
    name: displayName,
    url: profileUrl,
    stageName: profile.stageName ?? undefined,
    avatarUrl: profile.avatarUrl ?? undefined,
    bio: profile.bio ?? undefined,
    cityName,
    socialLinks,
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-12" dir="rtl">
      <JsonLd data={[breadcrumbs, personJsonLd]} />
      <header className="flex flex-col items-start gap-6 rounded-md border border-border bg-background p-6 shadow-sm">
        <div className="flex w-full flex-col gap-6 sm:flex-row sm:items-center">
          {profile.avatarUrl ? (
            <div className="h-40 w-40 overflow-hidden rounded-lg border border-border/60">
              <Image
                src={profile.avatarUrl}
                alt={`تصویر ${displayName}`}
                width={256}
                height={256}
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
          <div className="flex-1 space-y-3">
            <h1 className="text-3xl font-bold">{displayName}</h1>
            {cityName ? (
              <p className="text-sm text-muted-foreground">ساکن {cityName}</p>
            ) : null}
            {profile.bio ? (
              <p className="text-sm leading-7 text-muted-foreground">{profile.bio}</p>
            ) : null}
          </div>
        </div>
        {skills.length ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : null}
        {socialLinks.length ? (
          <div className="flex flex-wrap gap-3 text-sm">
            {socialLinks.map((link) => (
              <a
                key={link}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                {link}
              </a>
            ))}
          </div>
        ) : null}
      </header>

      {gallery.length ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">گالری تصاویر</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {gallery.map((item) => (
              <Card key={item.url}>
                <CardContent className="p-0">
                  <Image
                    src={item.url}
                    alt={`تصویر ${displayName}`}
                    width={600}
                    height={400}
                    className="h-64 w-full rounded-md object-cover"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

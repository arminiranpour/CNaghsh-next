import Image from "next/image";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCities } from "@/lib/location/cities";
import { getModerationDetail } from "@/lib/profile/moderation";
import { SKILLS, type SkillKey } from "@/lib/profile/skills";

import { ModerationActions } from "../_components/moderation-actions";

type GalleryEntry = {
  url?: unknown;
  width?: unknown;
  height?: unknown;
};

type SocialLinks = Record<string, unknown> | null | undefined;

type EventLabelMap = Record<
  "APPROVE" | "REJECT" | "REVERT_TO_PENDING" | "HIDE" | "UNHIDE" | "SYSTEM_AUTO_UNPUBLISH",
  string
>;

const STATUS_LABELS = {
  PENDING: "در انتظار بررسی",
  APPROVED: "تایید شده",
  REJECTED: "رد شده",
} as const;

const STATUS_VARIANTS = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
} as const;

const VISIBILITY_LABELS = {
  PUBLIC: "منتشر",
  PRIVATE: "غیرمنتشر",
} as const;

const EVENT_LABELS: EventLabelMap = {
  APPROVE: "تایید",
  REJECT: "رد",
  REVERT_TO_PENDING: "بازگشت به بررسی",
  HIDE: "عدم نمایش",
  UNHIDE: "نمایش",
  SYSTEM_AUTO_UNPUBLISH: "عدم نمایش سیستمی",
};

const SKILL_LABELS = new Map<SkillKey, string>(
  SKILLS.map((skill) => [skill.key, skill.label] as const),
);
const SKILL_KEYS = new Set<string>(SKILLS.map((skill) => skill.key));

function isSkillKey(value: unknown): value is SkillKey {
  return typeof value === "string" && SKILL_KEYS.has(value);
}

function getDisplayName(
  stageName?: string | null,
  firstName?: string | null,
  lastName?: string | null,
) {
  if (stageName && stageName.trim()) {
    return stageName.trim();
  }
  const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return fullName || "بدون نام";
}

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

export default async function ModerationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [detail, cities] = await Promise.all([
    getModerationDetail(params.id),
    getCities(),
  ]);

  if (!detail) {
    notFound();
  }

  const { profile, events } = detail;
  const cityMap = new Map(cities.map((city) => [city.id, city.name] as const));
  const displayName = getDisplayName(profile.stageName, profile.firstName, profile.lastName);
  const cityName = profile.cityId ? cityMap.get(profile.cityId) ?? profile.cityId : "نامشخص";
  const skills = Array.isArray(profile.skills)
    ? (profile.skills as unknown[])
        .filter(isSkillKey)
        .map((key) => ({ key, label: SKILL_LABELS.get(key) ?? key }))
    : [];
  const gallery = normalizeGallery(profile.gallery);
  const socialLinks = extractSocialLinks(profile.socialLinks as SocialLinks);

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex flex-col gap-4 rounded-lg border border-border bg-background p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">پروفایل {displayName}</h1>
            <p className="text-sm text-muted-foreground">شناسه پروفایل: {profile.id}</p>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span>کاربر: {profile.user?.name ?? "بدون نام"}</span>
              <span>ایمیل: {profile.user?.email ?? "نامشخص"}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_VARIANTS[profile.moderationStatus]}>
              {STATUS_LABELS[profile.moderationStatus]}
            </Badge>
            <Badge variant={profile.visibility === "PUBLIC" ? "secondary" : "outline"}>
              {VISIBILITY_LABELS[profile.visibility]}
            </Badge>
          </div>
        </div>
        <ModerationActions
          profileId={profile.id}
          status={profile.moderationStatus}
          visibility={profile.visibility}
        />
        {profile.moderationNotes ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="font-medium">یادداشت اخیر:</div>
            <p className="leading-6">{profile.moderationNotes}</p>
          </div>
        ) : null}
        {profile.moderator ? (
          <div className="text-xs text-muted-foreground">
            آخرین بررسی توسط {profile.moderator.name ?? profile.moderator.email ?? "نامشخص"}
            {profile.moderatedAt
              ? ` در ${new Date(profile.moderatedAt).toLocaleString("fa-IR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}`
              : ""}
          </div>
        ) : null}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>اطلاعات اصلی</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div className="flex-shrink-0">
              <div className="h-32 w-32 overflow-hidden rounded-lg border border-border">
                {profile.avatarUrl ? (
                  <Image
                    src={profile.avatarUrl}
                    alt={`تصویر ${displayName}`}
                    width={128}
                    height={128}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                    بدون تصویر
                  </div>
                )}
              </div>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <div className="text-muted-foreground">نام</div>
                <div className="font-medium">{displayName}</div>
              </div>
              <div>
                <div className="text-muted-foreground">شهر</div>
                <div className="font-medium">{cityName}</div>
              </div>
              <div>
                <div className="text-muted-foreground">سن</div>
                <div className="font-medium">{profile.age ?? "نامشخص"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">تلفن</div>
                <div className="font-medium">{profile.phone ?? "نامشخص"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">آدرس</div>
                <div className="font-medium">{profile.address ?? "نامشخص"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">تاریخ بروزرسانی</div>
                <div className="font-medium">
                  {new Date(profile.updatedAt).toLocaleString("fa-IR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </div>
              </div>
            </div>
          </div>
          {socialLinks.length ? (
            <div className="space-y-2">
              <div className="text-sm font-medium">لینک‌ها</div>
              <div className="flex flex-wrap gap-2 text-sm">
                {socialLinks.map((link) => (
                  <a
                    key={link}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-border px-3 py-1 text-muted-foreground hover:text-foreground"
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>زندگی‌نامه و مهارت‌ها</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <div className="text-muted-foreground">بیوگرافی</div>
            <p className="leading-7 text-foreground">
              {profile.bio ?? "اطلاعاتی ثبت نشده است."}
            </p>
          </div>
          <div>
            <div className="text-muted-foreground">مهارت‌ها</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {skills.length ? (
                skills.map((skill) => (
                  <Badge key={skill.key} variant="outline">
                    {skill.label}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">مهارتی ثبت نشده است.</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>گالری</CardTitle>
        </CardHeader>
        <CardContent>
          {gallery.length ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {gallery.map((item) => (
                <div key={item.url} className="overflow-hidden rounded-lg border border-border">
                  <Image
                    src={item.url}
                    alt={`تصویر ${displayName}`}
                    width={320}
                    height={240}
                    className="h-40 w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">تصویری ثبت نشده است.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>رویدادهای ممیزی اخیر</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {events.length ? (
            events.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{EVENT_LABELS[event.action]}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString("fa-IR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  توسط {event.actor?.name ?? event.actor?.email ?? "سیستم"}
                </div>
                {event.reason ? (
                  <div className="mt-2 text-sm leading-6">{event.reason}</div>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">رویدادی ثبت نشده است.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

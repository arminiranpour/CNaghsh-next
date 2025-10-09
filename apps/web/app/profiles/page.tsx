export const revalidate = 60;

import Image from "next/image";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCities } from "@/lib/location/cities";
import {
  getPublicDirectoryProfiles,
  type PublicDirectoryProfile,
} from "@/lib/profile/directoryQueries";
import { SKILLS, type SkillKey } from "@/lib/profile/skills";

const SKILL_OPTIONS = SKILLS.map((skill) => ({ key: skill.key, label: skill.label }));

type SearchParams = {
  city?: string | string[];
  skill?: string | string[];
};

function normalizeSkillLabels(skills: unknown): string[] {
  if (!Array.isArray(skills)) {
    return [];
  }
  const labels: string[] = [];
  const labelMap = new Map(SKILLS.map((skill) => [skill.key, skill.label] as const));
  for (const entry of skills) {
    if (typeof entry === "string" && labelMap.has(entry as SkillKey)) {
      labels.push(labelMap.get(entry as SkillKey) ?? entry);
    }
  }
  return labels;
}

function getDisplayName(profile: PublicDirectoryProfile) {
  if (profile.stageName?.trim()) {
    return profile.stageName.trim();
  }
  const fullName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();
  return fullName || "بدون نام";
}

export default async function ProfilesDirectory({ searchParams }: { searchParams: SearchParams }) {
  const cityFilter = typeof searchParams.city === "string" ? searchParams.city : undefined;
  const skillFilter = typeof searchParams.skill === "string" ? searchParams.skill : undefined;

  const [cities, profiles] = await Promise.all([
    getCities(),
    getPublicDirectoryProfiles({ cityId: cityFilter, skill: skillFilter }),
  ]);

  const cityMap = new Map(cities.map((city) => [city.id, city.name] as const));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-12" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>پروفایل هنرمندان</CardTitle>
          <CardDescription>با فیلتر کردن بر اساس شهر و مهارت، هنرمند مورد نظر خود را پیدا کنید.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" method="get">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="city">
                شهر
              </label>
              <select
                id="city"
                name="city"
                defaultValue={cityFilter ?? ""}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">همه شهرها</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="skill">
                مهارت
              </label>
              <select
                id="skill"
                name="skill"
                defaultValue={skillFilter ?? ""}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">همه مهارت‌ها</option>
                {SKILL_OPTIONS.map((skill) => (
                  <option key={skill.key} value={skill.key}>
                    {skill.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                اعمال فیلتر
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {profiles.length === 0 ? (
        <div className="rounded-md border border-border bg-background p-6 text-center text-sm text-muted-foreground">
          هنرمندی با فیلترهای انتخابی یافت نشد.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => {
            const displayName = getDisplayName(profile);
            const skills = normalizeSkillLabels(profile.skills);
            const updatedLabel = new Intl.DateTimeFormat("fa-IR", {
              dateStyle: "medium",
            }).format(profile.updatedAt);
            const cityName = profile.cityId ? cityMap.get(profile.cityId) ?? profile.cityId : undefined;

            return (
              <Link
                key={profile.id}
                href={`/profiles/${profile.id}`}
                className="group rounded-md border border-border bg-background shadow-sm transition hover:border-primary"
              >
                <Card className="border-none">
                  <CardHeader className="flex flex-row items-center gap-4">
                    {profile.avatarUrl ? (
                      <div className="h-16 w-16 overflow-hidden rounded-full border border-border/60">
                        <Image
                          src={profile.avatarUrl}
                          alt={displayName}
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                          sizes="64px"
                        />
                      </div>
                    ) : null}
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-semibold text-foreground">
                        {displayName}
                      </CardTitle>
                      {cityName ? (
                        <CardDescription>شهر: {cityName}</CardDescription>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {skills.length ? (
                      <div className="flex flex-wrap gap-2">
                        {skills.slice(0, 4).map((skill) => (
                          <Badge key={skill} variant="outline" className="bg-muted">
                            {skill}
                          </Badge>
                        ))}
                        {skills.length > 4 ? (
                          <span className="text-xs text-muted-foreground">
                            +{skills.length - 4} مورد دیگر
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">مهارتی ثبت نشده است.</p>
                    )}
                    <p className="text-xs text-muted-foreground">به‌روزرسانی: {updatedLabel}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

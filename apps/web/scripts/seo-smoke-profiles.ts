import { buildCanonical } from "../lib/seo/canonical";
import { getBaseUrl } from "../lib/seo/baseUrl";
import { profilePersonJsonLd, websiteJsonLd } from "../lib/seo/jsonld";
import { prisma } from "../lib/prisma";

function extractSocialLinks(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const links: string[] = [];
  for (const value of Object.values(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value.startsWith("http")) {
      links.push(value);
    }
  }
  return links;
}

async function main() {
  const canonical = buildCanonical("/profiles", { city: "tehran", page: 2 });
  console.log("Sample canonical:", canonical);

  const baseUrl = getBaseUrl();
  const webSiteJson = websiteJsonLd({
    url: baseUrl,
    searchUrlProfiles: `${baseUrl}/profiles`,
    searchUrlJobs: `${baseUrl}/jobs`,
  });
  console.log("WebSite JSON-LD:\n", JSON.stringify(webSiteJson, null, 2));

  const profile = await prisma.profile.findFirst({
    where: {
      visibility: "PUBLIC",
      moderationStatus: "APPROVED",
      publishedAt: { not: null },
    },
    select: {
      id: true,
      stageName: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      bio: true,
      cityId: true,
      socialLinks: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!profile) {
    console.log("No public profiles available for smoke test.");
    return;
  }

  const displayName = profile.stageName?.trim()
    ? profile.stageName.trim()
    : `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "پروفایل";

  const person = profilePersonJsonLd({
    name: displayName,
    url: `${baseUrl}/profiles/${profile.id}`,
    stageName: profile.stageName ?? undefined,
    avatarUrl: profile.avatarUrl ?? undefined,
    bio: profile.bio ?? undefined,
    cityName: profile.cityId ?? undefined,
    socialLinks: extractSocialLinks(profile.socialLinks),
  });

  console.log("Person JSON-LD:\n", JSON.stringify(person, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

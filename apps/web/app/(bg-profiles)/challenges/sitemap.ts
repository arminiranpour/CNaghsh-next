import type { MetadataRoute } from "next";

import { fetchPublishedChallengeSitemapEntries } from "@/lib/challenges/public/queries";
import { getBaseUrl } from "@/lib/seo/baseUrl";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  try {
    const challenges = await fetchPublishedChallengeSitemapEntries();

    return challenges.map((challenge) => ({
      url: `${baseUrl}/challenges/${challenge.id}`,
      lastModified: challenge.updatedAt,
    }));
  } catch (error) {
    console.error("[challenges.sitemap] Failed to load challenges for sitemap", error);
    return [];
  }
}

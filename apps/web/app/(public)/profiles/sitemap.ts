import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/seo/baseUrl";

const MAX_ENTRIES = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  const profiles = await prisma.profile.findMany({
    where: {
      visibility: "PUBLIC",
      moderationStatus: "APPROVED",
      publishedAt: { not: null },
    },
    select: {
      id: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: MAX_ENTRIES,
  });

  return profiles.map((profile) => ({
    url: `${baseUrl}/profiles/${profile.id}`,
    lastModified: profile.updatedAt,
  }));
}


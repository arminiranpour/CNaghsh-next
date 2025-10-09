import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/seo/baseUrl";

export const revalidate = 86400;

const MAX_ENTRIES = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  const jobs = await prisma.job.findMany({
    where: {
      status: "PUBLISHED",
      moderation: "APPROVED",
    },
    select: {
      id: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: MAX_ENTRIES,
  });

  return jobs.map((job) => ({
    url: `${baseUrl}/jobs/${job.id}`,
    lastModified: job.updatedAt,
  }));
}


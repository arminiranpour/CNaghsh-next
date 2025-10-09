import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { buildAbsoluteUrl } from "@/lib/url";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
    take: 500,
  });

  return jobs.map((job) => ({
    url: buildAbsoluteUrl(`/jobs/${job.id}`),
    lastModified: job.updatedAt,
  }));
}

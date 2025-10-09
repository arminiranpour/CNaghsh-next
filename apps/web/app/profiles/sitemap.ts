import type { MetadataRoute } from "next";

import { CAN_PUBLISH_PROFILE } from "@/lib/billing/entitlementKeys";
import { prisma } from "@/lib/prisma";
import { buildAbsoluteUrl } from "@/lib/url";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const profiles = await prisma.profile.findMany({
    where: {
      visibility: "PUBLIC",
      moderationStatus: "APPROVED",
      publishedAt: { not: null },
      user: {
        entitlements: {
          some: {
            key: CAN_PUBLISH_PROFILE,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        },
      },
    },
    select: {
      id: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  return profiles.map((profile) => ({
    url: buildAbsoluteUrl(`/profiles/${profile.id}`),
    lastModified: profile.updatedAt,
  }));
}

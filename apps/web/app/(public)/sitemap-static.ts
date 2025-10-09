import type { MetadataRoute } from "next";

import { getBaseUrl } from "@/lib/seo/baseUrl";

export const revalidate = 86400;

const STATIC_PATHS = ["/", "/profiles", "/jobs", "/pricing", "/castings"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const lastModified = new Date();

  return STATIC_PATHS.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}


import type { MetadataRoute } from "next";

import { buildAbsoluteUrl } from "@/lib/url";

export const revalidate = 86400;

const STATIC_PATHS = ["/", "/profiles", "/jobs", "/pricing"] as const;

export default function sitemapStatic(): MetadataRoute.Sitemap {
  return STATIC_PATHS.map((path) => ({
    url: buildAbsoluteUrl(path),
  }));
}

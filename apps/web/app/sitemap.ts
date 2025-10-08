import type { MetadataRoute } from "next";

import { getBaseUrl } from "@/lib/seo/baseUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();

  return [
    { url: `${baseUrl}/sitemap-static.xml` },
    { url: `${baseUrl}/profiles/sitemap.xml` },
    { url: `${baseUrl}/jobs/sitemap.xml` },
  ];
}


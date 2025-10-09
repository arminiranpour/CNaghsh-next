import type { MetadataRoute } from "next";

import { buildAbsoluteUrl } from "@/lib/url";

export const revalidate = 86400;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: buildAbsoluteUrl("/") },
    { url: buildAbsoluteUrl("/profiles") },
    { url: buildAbsoluteUrl("/jobs") },
    { url: buildAbsoluteUrl("/pricing") },
  ];
}

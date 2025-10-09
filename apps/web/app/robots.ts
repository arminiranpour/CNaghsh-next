import type { MetadataRoute } from "next";

import { buildAbsoluteUrl } from "@/lib/url";

export const revalidate = 86400;

export default function robots(): MetadataRoute.Robots {
  const origin = new URL(buildAbsoluteUrl("/")).origin;

  return {
    host: origin,
    sitemap: [
      buildAbsoluteUrl("/sitemap.xml"),
      buildAbsoluteUrl("/sitemap-static.xml"),
      buildAbsoluteUrl("/profiles/sitemap.xml"),
      buildAbsoluteUrl("/jobs/sitemap.xml"),
    ],
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
  };
}

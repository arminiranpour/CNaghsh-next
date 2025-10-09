import type { MetadataRoute } from "next";

import { getBaseUrl } from "@/lib/seo/baseUrl";

export const revalidate = 86400;

const DISALLOWED_PATHS = [
  "/api",
  "/_next",
  "/assets",
  "/private",
  "/admin",
  "/dashboard",
  "/billing",
  "/checkout",
  "/users",
];

export default function robots(): MetadataRoute.Robots {
  const host = getBaseUrl();

  return {
    host,
    sitemap: `${host}/sitemap.xml`,
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
    ],
  };
}


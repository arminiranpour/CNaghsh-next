import "server-only";

import { cookies } from "next/headers";

import { getBaseUrl } from "@/lib/seo/baseUrl";

type ManifestResponse = {
  ok?: boolean;
  url?: string;
};

export async function getManifestUrlForMedia(mediaId: string): Promise<string | null> {
  if (!mediaId) {
    return null;
  }

  try {
    const cookieStore = cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
    const response = await fetch(`${getBaseUrl()}/api/media/${mediaId}/manifest`, {
      headers: {
        accept: "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as ManifestResponse;

    if (data?.ok && typeof data.url === "string") {
      return data.url;
    }

    return null;
  } catch (error) {
    return null;
  }
}

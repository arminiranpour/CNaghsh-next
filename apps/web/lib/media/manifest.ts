import "server-only";

import { cookies } from "next/headers";

import type { MediaPlaybackInfo, MediaPlaybackKind } from "@/lib/media/urls";
import { getBaseUrl } from "@/lib/seo/baseUrl";

type ManifestResponse = {
  ok?: boolean;
  url?: string;
  manifestUrl?: string;
  posterUrl?: string | null;
  mode?: "public" | "signed";
};

const resolvePlaybackKind = (mode?: "public" | "signed"): MediaPlaybackKind => {
  if (mode === "signed") {
    return "private-signed";
  }
  return "public-direct";
};

export async function getManifestUrlForMedia(mediaId: string): Promise<MediaPlaybackInfo | null> {
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
    });

    if (!response.ok) {
      console.warn("[media] Manifest request failed", {
        mediaId,
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const data = (await response.json()) as ManifestResponse;

    const manifestUrl =
      typeof data.manifestUrl === "string"
        ? data.manifestUrl
        : typeof data.url === "string"
          ? data.url
          : null;

    if (data?.ok && manifestUrl) {
      return {
        manifestUrl,
        posterUrl: data.posterUrl ?? null,
        kind: resolvePlaybackKind(data.mode),
      };
    }

    console.warn("[media] Manifest response missing manifestUrl", { mediaId, data });
    return null;
  } catch (error) {
    console.error("[media] Failed to fetch manifest for media", {
      mediaId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

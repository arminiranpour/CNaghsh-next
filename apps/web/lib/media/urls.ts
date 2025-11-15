import type { MediaAsset } from "@prisma/client";

import { mediaCdnConfig } from "@/lib/media/cdn-config";

export type MediaPlaybackKind = "public-direct" | "private-signed" | "private-proxy";

export type MediaPlaybackInfo = {
  kind: MediaPlaybackKind;
  manifestUrl: string;
  posterUrl: string | null;
};

const encodeKey = (key: string) =>
  key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const normalizeKey = (key: string) => key.replace(/^\/+/, "");

const buildUrl = (base: string, key: string) => {
  const normalizedKey = normalizeKey(key);
  return `${base}/${encodeKey(normalizedKey)}`;
};

export function getPublicMediaUrlFromKey(key: string): string {
  return buildUrl(mediaCdnConfig.cdnBaseUrl, key);
}

export function getPrivateMediaOriginUrlFromKey(key: string): string {
  return buildUrl(mediaCdnConfig.originBaseUrl, key);
}

export function getPlaybackInfoForMedia(media: MediaAsset): MediaPlaybackInfo {
  if (!media.outputKey) {
    throw new Error("Media output key is required for playback info.");
  }
  if (media.visibility === "public") {
    return {
      kind: "public-direct",
      manifestUrl: getPublicMediaUrlFromKey(media.outputKey),
      posterUrl: media.posterKey ? getPublicMediaUrlFromKey(media.posterKey) : null,
    };
  }
  return {
    kind: "private-proxy",
    manifestUrl: `/api/media/${media.id}/manifest`,
    posterUrl: null,
  };
}

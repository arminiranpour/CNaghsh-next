import type { MediaAsset } from "@prisma/client";

import { publicBaseUrl } from "@/lib/storage/urls";
import { resolveBucketForVisibility } from "@/lib/storage/visibility";

export type MediaPlaybackKind = "public-direct" | "private-signed" | "private-proxy";

export type MediaPlaybackInfo = {
  kind: MediaPlaybackKind;
  manifestUrl: string;
  posterUrl: string | null;
};

const normalizedCdnBaseUrl = (() => {
  const value = process.env.PUBLIC_MEDIA_CDN_BASE_URL?.trim();
  if (!value || value.length === 0) {
    return null;
  }
  return value.replace(/\/+$/, "");
})();

const encodeKey = (key: string) =>
  key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const normalizeKey = (key: string) => key.replace(/^\/+/, "");

const buildPublicMediaUrlFromKey = (key: string) => {
  const normalizedKey = normalizeKey(key);
  if (normalizedCdnBaseUrl) {
    return `${normalizedCdnBaseUrl}/${encodeKey(normalizedKey)}`;
  }
  const bucket = resolveBucketForVisibility("public");
  return publicBaseUrl(bucket, normalizedKey);
};

export const buildPosterUrlFromKey = (key: string, isPublic: boolean): string => {
  if (!isPublic) {
    return "";
  }
  return buildPublicMediaUrlFromKey(key);
};

export const getPlaybackInfoForMedia = (media: MediaAsset): MediaPlaybackInfo => {
  if (!media.outputKey) {
    throw new Error("Media output key is required for playback info.");
  }
  if (media.visibility === "public") {
    return {
      kind: "public-direct",
      manifestUrl: buildPublicMediaUrlFromKey(media.outputKey),
      posterUrl: media.posterKey ? buildPosterUrlFromKey(media.posterKey, true) : null,
    } satisfies MediaPlaybackInfo;
  }
  return {
    kind: "private-proxy",
    manifestUrl: `/api/media/${media.id}/manifest`,
    posterUrl: null,
  } satisfies MediaPlaybackInfo;
};

export { buildPublicMediaUrlFromKey };

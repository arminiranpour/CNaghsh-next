import type { MediaAsset } from "@prisma/client";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/media/cdn-config", () => ({
  mediaCdnConfig: {
    publicBaseUrl: "https://cdn.example.com/media-public",
    cdnBaseUrl: "https://cdn.example.com/media-public",
    originBaseUrl: "https://origin.example.com/media-public",
    isSignedCdn: false,
  },
}));

import { getPlaybackInfoForMedia } from "@/lib/media/urls";

const buildMediaAsset = (overrides: Partial<MediaAsset> = {}): MediaAsset => ({
  id: "asset_1",
  type: "video",
  status: "ready",
  visibility: "private",
  ownerUserId: "user_1",
  sourceKey: "source/key.mp4",
  outputKey: "processed/hls/default/index.m3u8",
  posterKey: "processed/posters/default.jpg",
  durationSec: null,
  width: null,
  height: null,
  codec: null,
  bitrate: null,
  sizeBytes: null,
  errorMessage: null,
  moderationStatus: "pending",
  moderationReason: null,
  moderationReviewedAt: null,
  moderationReviewedById: null,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  ...overrides,
});

describe("getPlaybackInfoForMedia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns CDN URLs for public media", () => {
    const playback = getPlaybackInfoForMedia(
      buildMediaAsset({
        id: "example",
        visibility: "public",
        outputKey: "processed/hls/example/index.m3u8",
        posterKey: "processed/posters/example.jpg",
      }),
    );

    expect(playback.kind).toBe("public-direct");
    expect(playback.manifestUrl).toBe(
      "https://cdn.example.com/media-public/processed/hls/example/index.m3u8",
    );
    expect(playback.posterUrl).toBe(
      "https://cdn.example.com/media-public/processed/posters/example.jpg",
    );
  });
});

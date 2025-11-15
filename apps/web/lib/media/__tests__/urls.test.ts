import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/media/cdn-config", () => ({
  mediaCdnConfig: {
    cdnBaseUrl: "https://cdn.example.com/media",
    originBaseUrl: "https://origin.example.com/media",
    isSignedCdn: false,
  },
}));

import { getPlaybackInfoForMedia } from "@/lib/media/urls";

describe("getPlaybackInfoForMedia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns CDN URLs for public media", () => {
    const playback = getPlaybackInfoForMedia({
      id: "example",
      visibility: "public",
      outputKey: "processed/hls/example/index.m3u8",
      posterKey: "processed/posters/example.jpg",
    } as any);

    expect(playback.kind).toBe("public-direct");
    expect(playback.manifestUrl).toBe(
      "https://cdn.example.com/media/processed/hls/example/index.m3u8",
    );
    expect(playback.posterUrl).toBe(
      "https://cdn.example.com/media/processed/posters/example.jpg",
    );
  });
});

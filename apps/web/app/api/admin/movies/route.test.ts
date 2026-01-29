import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

const requireAdminSessionMock = vi.fn();
vi.mock("@/lib/auth/admin", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

const prismaMock = {
  genre: { findMany: vi.fn() },
  mediaAsset: { findMany: vi.fn() },
  movie: { create: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

const buildRequest = (payload: unknown) =>
  new NextRequest("http://localhost/api/admin/movies", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: new Headers({ "content-type": "application/json" }),
  });

const buildPayload = (overrides: Record<string, unknown> = {}) => ({
  titleEn: "Test Movie",
  titleFa: "فیلم تست",
  director: "کارگردان",
  yearReleased: 2024,
  durationMinutes: 120,
  stars: "",
  awards: "",
  mediaType: "movie",
  ageRange: "PG-13",
  posterBigMediaAssetId: "poster-big",
  posterCardMediaAssetId: "poster-card",
  genreIds: ["genre-1", "genre-2"],
  ...overrides,
});

describe("admin movies route", () => {
  beforeEach(() => {
    requireAdminSessionMock.mockReset();
    prismaMock.genre.findMany.mockReset();
    prismaMock.mediaAsset.findMany.mockReset();
    prismaMock.movie.create.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("denies non-admin users", async () => {
    requireAdminSessionMock.mockRejectedValue(new Error("ADMIN_ACCESS_DENIED"));
    const { POST } = await import("./route");

    await expect(POST(buildRequest(buildPayload()))).rejects.toThrow("ADMIN_ACCESS_DENIED");
  });

  it("returns field errors when required data is missing", async () => {
    requireAdminSessionMock.mockResolvedValue({ user: { id: "admin-1" } });
    const { POST } = await import("./route");

    const response = await POST(
      buildRequest(
        buildPayload({
          titleFa: "",
          director: "",
          genreIds: [],
          posterBigMediaAssetId: "",
        }),
      ),
    );

    expect(response.status).toBe(422);
    const payload = (await response.json()) as { ok: boolean; fieldErrors?: Record<string, string> };
    expect(payload.ok).toBe(false);
    expect(payload.fieldErrors?.titleFa).toBeTruthy();
    expect(payload.fieldErrors?.director).toBeTruthy();
    expect(payload.fieldErrors?.genreIds).toBeTruthy();
    expect(payload.fieldErrors?.posterBigMediaAssetId).toBeTruthy();
    expect(prismaMock.movie.create).not.toHaveBeenCalled();
  });

  it("creates movie with genres and posters", async () => {
    requireAdminSessionMock.mockResolvedValue({ user: { id: "admin-1" } });
    prismaMock.genre.findMany.mockResolvedValue([{ id: "genre-1" }, { id: "genre-2" }]);
    prismaMock.mediaAsset.findMany.mockResolvedValue([
      { id: "poster-big", type: "image" },
      { id: "poster-card", type: "image" },
    ]);
    prismaMock.movie.create.mockResolvedValue({ id: "movie-1" });

    const { POST } = await import("./route");
    const response = await POST(buildRequest(buildPayload()));

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { ok: boolean; id: string };
    expect(payload.ok).toBe(true);
    expect(payload.id).toBe("movie-1");

    expect(prismaMock.movie.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          titleEn: "Test Movie",
          titleFa: "فیلم تست",
          posterBigMediaAssetId: "poster-big",
          posterCardMediaAssetId: "poster-card",
          createdByUserId: "admin-1",
          genres: {
            connect: [{ id: "genre-1" }, { id: "genre-2" }],
          },
        }),
      }),
    );
  });
});

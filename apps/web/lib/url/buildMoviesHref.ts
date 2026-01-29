export type MovieSearchParams = {
  q?: string;
  mediaType?: "movie" | "series";
  yearFrom?: number;
  yearTo?: number;
  country?: string;
  ageRange?: string;
  genreIds?: string[];
  page?: number;
};

export function buildMoviesHref(
  normalized: MovieSearchParams,
  overridesFactory: () => Partial<MovieSearchParams>,
) {
  const overrides = overridesFactory();
  const next: MovieSearchParams = { ...normalized, ...overrides };

  const params = new URLSearchParams();

  if (next.q) params.set("q", next.q);
  if (next.mediaType) params.set("mediaType", next.mediaType);
  if (typeof next.yearFrom === "number") params.set("yearFrom", String(next.yearFrom));
  if (typeof next.yearTo === "number") params.set("yearTo", String(next.yearTo));
  if (next.country) params.set("country", next.country);
  if (next.ageRange) params.set("ageRange", next.ageRange);
  if (Array.isArray(next.genreIds) && next.genreIds.length) {
    params.set("genreIds", next.genreIds.join(","));
  }

  const pageValue = overrides.page ?? next.page;
  if (pageValue && pageValue > 1) {
    params.set("page", pageValue.toString());
  }

  const search = params.toString();
  return search ? `/movies?${search}` : "/movies";
}

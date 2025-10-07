import { normalizeSearchParams } from "@/lib/url/normalizeSearchParams";

type CanonicalParams = Record<string, unknown>;

const DEFAULT_BASE_URL = "http://localhost:3000";

export function buildCanonical(pathname: string, params: CanonicalParams): string {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const url = new URL(pathname, `${baseUrl}/`);

  const normalized = normalizeSearchParams(normalizeInput(params));
  const searchParams = new URLSearchParams();

  if (normalized.query) {
    searchParams.set("query", normalized.query);
  }
  if (normalized.city) {
    searchParams.set("city", normalized.city);
  }
  if (normalized.skills?.length) {
    searchParams.set("skills", normalized.skills.join(","));
  }
  if (normalized.gender) {
    searchParams.set("gender", normalized.gender);
  }
  if (normalized.sort) {
    searchParams.set("sort", normalized.sort);
  }
  if (typeof normalized.page === "number") {
    searchParams.set("page", normalized.page.toString(10));
  }
  if (normalized.remote) {
    searchParams.set("remote", normalized.remote);
  }
  if (normalized.category) {
    searchParams.set("category", normalized.category);
  }
  if (normalized.payType) {
    searchParams.set("payType", normalized.payType);
  }
  if (normalized.featured) {
    searchParams.set("featured", normalized.featured);
  }

  const queryString = searchParams.toString();
  if (queryString) {
    url.search = queryString;
  }

  return url.toString();
}

function normalizeInput(params: CanonicalParams): Record<string, string | string[] | undefined> {
  const normalized: Record<string, string | string[] | undefined> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      normalized[key] = value.map((entry) => String(entry));
      continue;
    }

    if (value instanceof URLSearchParams) {
      normalized[key] = value.toString();
      continue;
    }

    normalized[key] = String(value);
  }

  return normalized;
}

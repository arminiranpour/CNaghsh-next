import { env } from "@/lib/env";

const base = new URL(env.PUBLIC_BASE_URL);

const ensureLeadingSlash = (path: string): string => {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }

  return path;
};

export const buildAbsoluteUrl = (path: string): string => {
  const normalizedPath = ensureLeadingSlash(path);
  return `${env.PUBLIC_BASE_URL}${normalizedPath}`;
};

export const isSameOrigin = (url: string): boolean => {
  try {
    const candidate = new URL(url);
    return candidate.origin === base.origin;
  } catch (error) {
    return false;
  }
};

export const sanitizeReturnUrl = (input?: string, fallbackPath = "/"): string => {
  const fallback = buildAbsoluteUrl(fallbackPath);

  if (!input) {
    return fallback;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    const candidate = new URL(trimmed);
    if (candidate.origin === base.origin) {
      return candidate.toString();
    }
  } catch (error) {
    if (trimmed.startsWith("/")) {
      return buildAbsoluteUrl(trimmed);
    }

    return fallback;
  }

  if (trimmed.startsWith("/")) {
    return buildAbsoluteUrl(trimmed);
  }

  return fallback;
};
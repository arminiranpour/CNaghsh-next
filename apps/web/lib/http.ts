import { NextResponse } from "next/server";

export const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

export const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
} as const;

const mergeHeaders = (overrides?: globalThis.HeadersInit) => {
  const headers = new Headers(NO_STORE_HEADERS);

  if (overrides) {
    new Headers(overrides).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
};

type JsonOptions = {
  headers?: globalThis.HeadersInit;
};

export const ok = <T>(data: T, options: JsonOptions = {}) => {
  const headers = mergeHeaders(options.headers);

  return NextResponse.json(data, { headers });
};

const errorResponse = (status: number, message: string, options?: JsonOptions) => {
  const headers = mergeHeaders(options?.headers);

  return NextResponse.json({ error: message }, { status, headers });
};

export const badRequest = (message: string, options?: JsonOptions) =>
  errorResponse(400, message, options);

export const unauthorized = (message: string, options?: JsonOptions) =>
  errorResponse(401, message, options);

export const notFound = (message: string, options?: JsonOptions) =>
  errorResponse(404, message, options);

export const serverError = (message: string, options?: JsonOptions) =>
  errorResponse(500, message, options);

type SafeJsonSuccess<T> = { ok: true; data: T };
type SafeJsonFailure = { ok: false; reason: "INVALID_JSON" };

export const safeJson = async <T>(request: Request): Promise<
  SafeJsonSuccess<T> | SafeJsonFailure
> => {
  try {
    const data = (await request.json()) as T;
    return { ok: true, data } satisfies SafeJsonSuccess<T>;
  } catch (error) {
    return { ok: false, reason: "INVALID_JSON" } satisfies SafeJsonFailure;
  }
};

export const getQuery = (request: Request, key: string): string | null => {
  const url = new URL(request.url);
  const value = url.searchParams.get(key);
  return value === null ? null : value;
};

type IntQueryOptions = {
  min?: number;
  max?: number;
};

export const getIntQuery = (
  request: Request,
  key: string,
  options: IntQueryOptions = {},
): number | null => {
  const value = getQuery(request, key);
  if (value === null) {
    return null;
  }

  if (!/^[-+]?\d+$/.test(value)) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed)) {
    return null;
  }

  if (options.min !== undefined && parsed < options.min) {
    return null;
  }

  if (options.max !== undefined && parsed > options.max) {
    return null;
  }

  return parsed;
};
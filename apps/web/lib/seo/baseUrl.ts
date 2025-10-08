const DEFAULT_BASE_URL = "http://localhost:3000";

export function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}


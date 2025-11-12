import { env } from "@/lib/env";

let cachedBaseUrl: string | null = null;

export function getBaseUrl(): string {
  if (cachedBaseUrl) {
    return cachedBaseUrl;
  }

  cachedBaseUrl = env.PUBLIC_BASE_URL;
  return cachedBaseUrl;
}


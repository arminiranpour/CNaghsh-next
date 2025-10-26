import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isEnabled } from "@/lib/flags";

const ADMIN_COOKIE = "ADMIN_USER_ID";
const ADMIN_HEADER = "x-admin-user-id";
const canaryEnabled = isEnabled("canary");
const devBypassActive =
  process.env.NODE_ENV !== "production" && process.env.DEV_ADMIN_BYPASS === "true";

export function middleware(request: NextRequest) {
  const requestHeaders = shouldInjectAdminHeader(request)
    ? injectAdminHeader(request)
    : undefined;

  const response = NextResponse.next(
    requestHeaders ? { request: { headers: requestHeaders } } : undefined,
  );

  if (canaryEnabled) {
    response.headers.set("x-rollout", "canary");
  }

  return response;
}

function shouldInjectAdminHeader(request: NextRequest) {
  if (!devBypassActive) {
    return false;
  }

  const hostname = request.nextUrl.hostname;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  if (!isLocalhost) {
    return false;
  }

  const cookie = request.cookies.get(ADMIN_COOKIE);
  if (!cookie?.value) {
    return false;
  }

  const pathname = request.nextUrl.pathname;
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

function injectAdminHeader(request: NextRequest) {
  const headers = new Headers(request.headers);
  const cookie = request.cookies.get(ADMIN_COOKIE);
  if (cookie?.value) {
    headers.set(ADMIN_HEADER, cookie.value);
  }
  return headers;
}

export const config = {
  matcher: ["/profiles/:path*", "/jobs/:path*", "/admin/:path*", "/api/admin/:path*"],
};

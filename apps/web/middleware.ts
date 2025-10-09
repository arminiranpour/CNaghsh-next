import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isEnabled } from "@/lib/flags";

const canaryEnabled = isEnabled("canary");

export function middleware(_request: NextRequest) {
  const response = NextResponse.next();

  if (canaryEnabled) {
    response.headers.set("x-rollout", "canary");
  }

  return response;
}

export const config = {
  matcher: ["/profiles/:path*", "/jobs/:path*"],
};

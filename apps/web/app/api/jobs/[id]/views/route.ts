import { NextResponse } from "next/server";

import { incrementJobViews } from "@/lib/jobs/views";

type RouteContext = {
  params: { id: string };
};

async function postHandler(_request: Request, { params }: RouteContext) {
  const jobId = params.id;

  if (!jobId) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  await incrementJobViews(jobId);

  return NextResponse.json({ success: true });
}

type RouteHandler = (
  request: Request,
  context: RouteContext,
) => Promise<NextResponse>;

let cachedHandler: RouteHandler | null = null;

async function resolveHandler(): Promise<RouteHandler> {
  if (cachedHandler) {
    return cachedHandler;
  }

  try {
    const sentry = await import("@sentry/nextjs");
    if (typeof sentry.wrapRouteHandlerWithSentry === "function") {
      cachedHandler = sentry.wrapRouteHandlerWithSentry(postHandler, {
        method: "POST",
        route: "app/api/jobs/[id]/views",
      }) as RouteHandler;
      return cachedHandler;
    }
  } catch (error) {
    // Sentry is optional in local/test environments without the dependency.
  }

  cachedHandler = postHandler as RouteHandler;
  return cachedHandler;
}

export async function POST(request: Request, context: RouteContext) {
  const handler = await resolveHandler();
  return handler(request, context);
}

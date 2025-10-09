import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_APP_VERSION;

  return NextResponse.json(
    {
      ok: true,
      ts: new Date().toISOString(),
      version: version ?? undefined,
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

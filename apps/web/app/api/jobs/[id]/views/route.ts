import { NextResponse } from "next/server";

import { incrementJobViews } from "@/lib/jobs/views";

type RouteContext = {
  params: { id: string };
};

export async function POST(_request: Request, { params }: RouteContext) {
  const jobId = params.id;

  if (!jobId) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  await incrementJobViews(jobId);

  return NextResponse.json({ success: true });
}

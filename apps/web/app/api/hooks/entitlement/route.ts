import { NextResponse } from "next/server";
import { z } from "zod";

import { enforceUserProfileVisibility } from "@/lib/profile/enforcement";

const payloadSchema = z.object({
  userId: z.string().min(1),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // TODO: Add authentication/authorization for entitlement hooks.
  await enforceUserProfileVisibility(parsed.data.userId);

  return NextResponse.json({ status: "ok" });
}

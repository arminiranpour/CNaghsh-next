import { NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { notFound, ok } from "@/lib/http";

type Params = {
  params: {
    sessionId: string;
  };
};

export async function GET(_request: NextRequest, { params }: Params) {
  const { sessionId } = params;
  const session = await prisma.checkoutSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      redirectUrl: true,
    },
  });

  if (!session) {
    return notFound("Session not found");
  }
  return ok(session);
}
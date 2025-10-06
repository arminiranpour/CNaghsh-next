import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

export const verifySignature = (header: string | null): boolean => {
  const secret = env.WEBHOOK_SHARED_SECRET;
  if (!secret) {
    return true;
  }

  if (typeof header !== "string") {
    return false;
  }

  const expected = Buffer.from(secret);
  const received = Buffer.from(header);

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
};
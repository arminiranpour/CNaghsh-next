import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_EXPIRY_DAYS = 30;

export type NotificationTokenPayload = {
  userId: string;
  issuedAt: number;
  expiresAt: number;
};

function getSecret(): string {
  const secret = process.env.NOTIFICATIONS_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NOTIFICATIONS_SECRET (or NEXTAUTH_SECRET) must be configured for signing links.");
  }
  return secret;
}

function toBase64Url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64Url(input: string): Buffer {
  const padLength = (4 - (input.length % 4)) % 4;
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLength);
  return Buffer.from(padded, "base64");
}

export function generateManageToken(userId: string, ttlDays = DEFAULT_EXPIRY_DAYS): string {
  const secret = getSecret();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + ttlDays * 24 * 60 * 60;
  const payload: NotificationTokenPayload = { userId, issuedAt, expiresAt };
  const payloadBuffer = Buffer.from(JSON.stringify(payload), "utf8");
  const payloadEncoded = toBase64Url(payloadBuffer);
  const hmac = createHmac("sha256", secret).update(payloadEncoded);
  const signature = toBase64Url(hmac.digest());
  return `${payloadEncoded}.${signature}`;
}

export function verifyManageToken(token: string): NotificationTokenPayload | null {
  if (!token || token.indexOf(".") === -1) {
    return null;
  }

  const [encodedPayload, encodedSignature] = token.split(".");
  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  try {
    const secret = getSecret();
    const expected = createHmac("sha256", secret).update(encodedPayload).digest();
    const received = fromBase64Url(encodedSignature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      return null;
    }

    const payloadJson = fromBase64Url(encodedPayload).toString("utf8");
    const payload = JSON.parse(payloadJson) as NotificationTokenPayload;
    if (!payload.userId || typeof payload.expiresAt !== "number") {
      return null;
    }

    if (payload.expiresAt * 1000 < Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

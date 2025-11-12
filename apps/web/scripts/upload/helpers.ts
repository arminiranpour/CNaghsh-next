import "../storage/env-loader";

import bcrypt from "bcryptjs";

import { prisma } from "../../lib/prisma";

const TEST_EMAIL = process.env.UPLOAD_SMOKE_EMAIL ?? "upload-smoke@example.com";
const TEST_PASSWORD = process.env.UPLOAD_SMOKE_PASSWORD ?? "UploadSmoke123!";

const getSetCookieHeaders = (headers: Headers) => {
  const typed = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof typed.getSetCookie === "function") {
    const values = typed.getSetCookie();
    if (values && values.length > 0) {
      return values;
    }
  }
  const fallback = headers.get("set-cookie");
  return fallback ? [fallback] : [];
};

const applyCookies = (jar: Map<string, string>, cookies: string[]) => {
  for (const cookie of cookies) {
    const [pair] = cookie.split(";");
    if (!pair) {
      continue;
    }
    const [name, ...valueParts] = pair.split("=");
    if (!name || valueParts.length === 0) {
      continue;
    }
    jar.set(name.trim(), valueParts.join("=").trim());
  }
};

const serializeCookies = (jar: Map<string, string>) => {
  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
};

export const getBaseUrl = () => {
  return process.env.BASE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
};

export const ensureUploadTestUser = async () => {
  const existing = await prisma.user.findUnique({
    where: { email: TEST_EMAIL },
    select: { id: true },
  });
  if (existing) {
    return { id: existing.id, email: TEST_EMAIL, password: TEST_PASSWORD };
  }
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
  const created = await prisma.user.create({
    data: {
      email: TEST_EMAIL,
      passwordHash,
    },
    select: { id: true },
  });
  return { id: created.id, email: TEST_EMAIL, password: TEST_PASSWORD };
};

export const authenticateUploadUser = async (baseUrl: string) => {
  const user = await ensureUploadTestUser();
  const cookies = new Map<string, string>();
  const csrfResponse = await fetch(new URL("/api/auth/csrf", baseUrl), {
    headers: { accept: "application/json" },
  });
  if (!csrfResponse.ok) {
    throw new Error(`Failed to fetch CSRF token (${csrfResponse.status})`);
  }
  applyCookies(cookies, getSetCookieHeaders(csrfResponse.headers));
  const csrfPayload = (await csrfResponse.json()) as { csrfToken?: string };
  const csrfToken = csrfPayload.csrfToken;
  if (!csrfToken) {
    throw new Error("CSRF token missing in response");
  }
  const body = new URLSearchParams({
    csrfToken,
    email: user.email,
    password: user.password,
    callbackUrl: baseUrl,
    json: "true",
  });
  const loginResponse = await fetch(new URL("/api/auth/callback/credentials", baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: serializeCookies(cookies),
    },
    redirect: "manual",
    body: body.toString(),
  });
  if (loginResponse.status >= 400) {
    throw new Error(`Login failed (${loginResponse.status})`);
  }
  applyCookies(cookies, getSetCookieHeaders(loginResponse.headers));
  const cookieHeader = serializeCookies(cookies);
  if (!cookieHeader) {
    throw new Error("Session cookie missing after login");
  }
  return { cookie: cookieHeader, userId: user.id, email: user.email };
};

export const shutdownPrisma = async () => {
  await prisma.$disconnect();
};

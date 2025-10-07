import bcrypt from "bcryptjs";
import Credentials from "next-auth/providers/credentials";
import type { PrismaClient } from "@prisma/client";
import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

import { createInMemoryRateLimiter } from "./rate-limit";

const signinLimiter = createInMemoryRateLimiter({
  max: 5,
  windowMs: 60_000,
  namespace: "signin",
});

type CredentialsInput = {
  email?: string;
  password?: string;
};

type JwtContext = Parameters<
  NonNullable<NonNullable<NextAuthOptions["callbacks"]>["jwt"]>
>[0];

type SessionContext = {
  session: Session;
  token: JWT;
};

const DEFAULT_DEV_SECRET = "development-next-auth-secret";

export function resolveNextAuthSecret() {
  const secretFromEnv = process.env.NEXTAUTH_SECRET;

  if (secretFromEnv && secretFromEnv.trim().length > 0) {
    return secretFromEnv;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_DEV_SECRET;
  }

  throw new Error(
    "NEXTAUTH_SECRET is required when running in production environments.",
  );
}

export function getAuthConfig(prisma: PrismaClient): NextAuthOptions {
  const secret = resolveNextAuthSecret();
  return {
    trustHost: true,
    secret,
    session: {
      strategy: "jwt",
    },
    pages: {
      signIn: "/auth/signin",
    },
    providers: [
      Credentials({
        name: "credentials",
        credentials: {
          email: { label: "Email", type: "text" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials: CredentialsInput | undefined) {
          const email = credentials?.email?.toLowerCase().trim();
          const password = credentials?.password;

          if (!email || !password) {
            throw new Error("ایمیل و رمز عبور الزامی است.");
          }

          if (!signinLimiter.allow(email)) {
            throw new Error("تعداد تلاش‌ها زیاد است. لطفاً بعداً تلاش کنید.");
          }

          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              passwordHash: true,
              role: true,
            },
          });

          if (!user?.passwordHash) {
            const withinLimit = signinLimiter.hit(email);
            if (!withinLimit) {
              throw new Error("تعداد تلاش‌ها زیاد است. لطفاً بعداً تلاش کنید.");
            }

            throw new Error("ایمیل یا رمز عبور نادرست است.");
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);

          if (!isValid) {
            const withinLimit = signinLimiter.hit(email);
            if (!withinLimit) {
              throw new Error("تعداد تلاش‌ها زیاد است. لطفاً بعداً تلاش کنید.");
            }

            throw new Error("ایمیل یا رمز عبور نادرست است.");
          }

          signinLimiter.reset(email);

          return {
            id: user.id,
            email: user.email,
            role: user.role,
          } satisfies User;
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user }: JwtContext) {
        if (user) {
          token.id = user.id;
          token.email = user.email;
          if ("role" in user && typeof user.role === "string") {
            token.role = user.role;
          }
        }

        return token;
      },
      async session({ session, token }: SessionContext) {
        if (session.user) {
          session.user.id = (token.id ?? session.user.id ?? "") as string;
          session.user.email = (token.email ?? session.user.email ?? "") as string;
          session.user.role =
            (token.role as "USER" | "ADMIN") ?? session.user.role ?? "USER";
        }

        return session;
      },
    },
  } satisfies NextAuthOptions;
}

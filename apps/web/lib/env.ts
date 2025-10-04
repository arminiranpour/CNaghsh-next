import { z } from "zod";

type NodeEnv = "development" | "test" | "production";

const envSchema = z
  .object({
    DATABASE_URL: z
      .string({ required_error: "DATABASE_URL is required" })
      .trim()
      .min(1, "DATABASE_URL is required"),
    PUBLIC_BASE_URL: z
      .string({ required_error: "PUBLIC_BASE_URL is required" })
      .trim()
      .min(1, "PUBLIC_BASE_URL is required")
      .refine((value) => !value.endsWith("/"), {
        message: "PUBLIC_BASE_URL must not end with a trailing slash",
      })
      .superRefine((value, ctx) => {
        let parsed: URL;
        try {
          parsed = new URL(value);
        } catch (error) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "PUBLIC_BASE_URL must be a valid absolute URL",
          });
          return;
        }

        if (!parsed.protocol || parsed.protocol === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "PUBLIC_BASE_URL must include a protocol",
          });
        }
      }),
    WEBHOOK_SHARED_SECRET: z
      .string()
      .trim()
      .min(1, "WEBHOOK_SHARED_SECRET cannot be empty")
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  })
  .superRefine((data, ctx) => {
    let base: URL | null = null;
    try {
      base = new URL(data.PUBLIC_BASE_URL);
    } catch (error) {
      // handled above
    }

    if (!base) {
      return;
    }

    const hostname = base.hostname.toLowerCase();
    const isLocalHostname =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.endsWith(".local");

    if (
      data.NODE_ENV === "production" &&
      base.protocol !== "https:" &&
      !isLocalHostname
    ) {      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["PUBLIC_BASE_URL"],
        message: "PUBLIC_BASE_URL must use https in production",
      });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

type ParseState =
  | { ok: true; data: AppEnv }
  | { ok: false; error: Error };

const rawEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL,
  WEBHOOK_SHARED_SECRET: process.env.WEBHOOK_SHARED_SECRET,
  NODE_ENV: (process.env.NODE_ENV as NodeEnv | undefined) ?? undefined,
};

const parsed = envSchema.safeParse(rawEnv);

let state: ParseState;
if (parsed.success) {
  state = { ok: true, data: parsed.data };
} else {
  const formatted = parsed.error.issues
    .map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("\n");

  state = {
    ok: false,
    error: new Error(`Invalid environment variables:\n${formatted}`),
  };
}

export const assertEnvReady = (): void => {
  if (!state.ok) {
    throw state.error;
  }
};

assertEnvReady();

if (!state.ok) {
  throw state.error;
}

export const env = state.data;

const baseUrl = new URL(env.PUBLIC_BASE_URL);

if (env.NODE_ENV === "development" && baseUrl.protocol !== "https:") {
  console.warn(
    `[env] PUBLIC_BASE_URL is using "${baseUrl.protocol}". HTTPS is required in production.`,
  );
}

export const isProd = env.NODE_ENV === "production";
export const isDev = env.NODE_ENV === "development";
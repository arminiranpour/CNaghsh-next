import { isEnabled } from "@/lib/flags";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV;
const shouldEnable = Boolean(dsn) && isEnabled("sentry");

if (shouldEnable) {
  void import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.init({
        dsn: dsn,
        environment,
        tracesSampleRate: 0.05,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
      });
    })
    .catch(() => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[sentry] client SDK not available; error monitoring disabled for this session");
      }
    });
}

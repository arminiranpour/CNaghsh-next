import * as Sentry from "@sentry/node";

let initialized = false;

export const initSentry = () => {
  if (initialized) {
    return;
  }
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }
  try {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      tracesSampleRate: 0.01,
    });
    initialized = true;
  } catch (error) {
    console.warn("[sentry] initialization failed", error);
  }
};

export const captureWorkerException = (error: unknown) => {
  if (!initialized) {
    return;
  }
  Sentry.captureException(error);
};

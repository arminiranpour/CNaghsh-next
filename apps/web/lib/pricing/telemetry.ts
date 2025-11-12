const EVENT_PREFIX = "pricing";

type PricingTelemetryEvent =
  | "pricing_viewed"
  | "pricing_toggle_cadence"
  | "pricing_cta_clicked"
  | "pricing_cta_blocked";

type PricingTelemetryContext = Record<string, unknown>;

export function emitPricingTelemetry(
  event: PricingTelemetryEvent,
  context: PricingTelemetryContext = {},
) {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    ...context,
  };

  // eslint-disable-next-line no-console
  console.info(`[${EVENT_PREFIX}.telemetry]`, payload);
}

export type { PricingTelemetryEvent };

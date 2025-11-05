const EVENT_PREFIX = "billing";

type TelemetryEvent =
  | "billing_sub_cancel_period_end_clicked"
  | "billing_sub_cancel_period_end_confirmed"
  | "billing_renew_now_clicked"
  | "billing_invoice_pdf_downloaded"
  | "billing_history_filtered";

type TelemetryContext = Record<string, unknown>;

export function emitBillingTelemetry(event: TelemetryEvent, context: TelemetryContext = {}) {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    ...context,
  };

  console.info(`[${EVENT_PREFIX}.telemetry]`, payload);
}

export type { TelemetryEvent };

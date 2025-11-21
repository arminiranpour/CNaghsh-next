export type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown> | undefined;

const SERVICE_NAME = "media-worker";

const write = (level: LogLevel, payload: Record<string, unknown>) => {
  const method = (console as Record<LogLevel, (message?: unknown, ...optional: unknown[]) => void>)[level] ?? console.log;
  method(JSON.stringify(payload));
};

export function log(level: LogLevel, event: string, fields?: LogFields): void {
  const payload = {
    service: SERVICE_NAME,
    event,
    level,
    timestamp: new Date().toISOString(),
    fields: fields ?? {},
  };
  write(level, payload);
}

export function logInfo(event: string, fields?: LogFields): void {
  log("info", event, fields);
}

export function logError(event: string, fields?: LogFields): void {
  log("error", event, fields);
}

export function logWarn(event: string, fields?: LogFields): void {
  log("warn", event, fields);
}

export function logDebug(event: string, fields?: LogFields): void {
  log("debug", event, fields);
}

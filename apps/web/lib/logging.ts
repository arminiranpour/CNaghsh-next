export type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown> | undefined;

const SERVICE_NAME = "web";

const write = (level: LogLevel, payload: Record<string, unknown>) => {
  const method = (console as Record<LogLevel, (message?: unknown, ...optional: unknown[]) => void>)[level] ?? console.log;
  method(JSON.stringify(payload));
};

export function log(level: LogLevel, event: string, fields?: LogFields): void {
  const body = {
    service: SERVICE_NAME,
    event,
    level,
    timestamp: new Date().toISOString(),
    fields: fields ?? {},
  };
  write(level, body);
}

export function logInfo(event: string, fields?: LogFields): void {
  log("info", event, fields);
}

export function logError(event: string, fields?: LogFields): void {
  log("error", event, fields);
}

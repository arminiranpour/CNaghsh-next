const SERVICE_NAME = "media-worker";

type LogLevel = "info" | "error" | "warn";

type LogContext = "worker" | "queue" | "bootstrap" | "script" | "job";

type LogFields = Record<string, unknown> | undefined;

const formatFields = (fields: LogFields) => {
  if (!fields || Object.keys(fields).length === 0) {
    return "";
  }
  return ` ${JSON.stringify(fields)}`;
};

const emit = (level: LogLevel, context: LogContext, message: string, fields?: LogFields) => {
  const line = `[${SERVICE_NAME}] [${level}] [${context}] ${message}${formatFields(fields)}`;
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
};

export const logger = {
  info: (context: LogContext, message: string, fields?: LogFields) => emit("info", context, message, fields),
  error: (context: LogContext, message: string, fields?: LogFields) => emit("error", context, message, fields),
  warn: (context: LogContext, message: string, fields?: LogFields) => emit("warn", context, message, fields),
};

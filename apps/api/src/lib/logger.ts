const REDACT_KEYS =
  /password|passwd|secret|token|authorization|cookie|database_url|direct_url|csrf|jwt|refresh|access/i;

function redactValue(key: string, value: unknown): unknown {
  if (REDACT_KEYS.test(key)) {
    return "[redacted]";
  }
  if (typeof value === "string" && /postgresql:\/\//i.test(value)) {
    return "[redacted-db-url]";
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return redactObject(value as Record<string, unknown>);
  }
  return value;
}

export function redactObject(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = redactValue(key, value);
  }
  return out;
}

type LogFields = Record<string, unknown>;

function write(level: "info" | "warn" | "error", message: string, fields?: LogFields) {
  const payload = {
    level,
    service: "luv-bank-api",
    message,
    time: new Date().toISOString(),
    ...(fields ? redactObject(fields) : {}),
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export const logger = {
  info(message: string, fields?: LogFields) {
    write("info", message, fields);
  },
  warn(message: string, fields?: LogFields) {
    write("warn", message, fields);
  },
  error(message: string, fields?: LogFields) {
    write("error", message, fields);
  },
};

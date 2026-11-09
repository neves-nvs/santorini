const SENSITIVE_KEY = /password|passwd|pwd|hash|salt|token|secret|cookie|authorization/i;

export const REDACTED = "[REDACTED]";

export const isSensitiveKey = (key: string) => SENSITIVE_KEY.test(key);

export function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value !== "object" || value === null || value instanceof Date || value instanceof Error) {
    return value;
  }
  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, isSensitiveKey(key) ? REDACTED : redact(item, seen)]),
  );
}

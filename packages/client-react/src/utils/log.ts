function sanitize(value: unknown): string {
  const text = typeof value === "string" ? value : (JSON.stringify(value) ?? String(value));
  return text.replace(/\n|\r/g, "");
}

function sanitizeAll(values: unknown[]): string[] {
  const sanitized: string[] = [];
  for (const value of values) {
    sanitized.push(sanitize(value));
  }
  return sanitized;
}

export const log = (...values: unknown[]) => console.log(...sanitizeAll(values));
export const logWarn = (...values: unknown[]) => console.warn(...sanitizeAll(values));
export const logError = (...values: unknown[]) => console.error(...sanitizeAll(values));

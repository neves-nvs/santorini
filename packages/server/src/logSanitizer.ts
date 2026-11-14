export function sanitizeForLog(value: unknown): string {
  return String(value).replace(/\n|\r/g, "");
}

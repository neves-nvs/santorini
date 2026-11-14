export function sanitizeForLog(value: unknown): string {
  return String(value).replace(/[\r\n]+/g, " ");
}

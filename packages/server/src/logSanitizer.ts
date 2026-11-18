export function sanitizeForLog(value: unknown): string {
  return String(value).replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, "");
}

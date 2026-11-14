function sanitize(value: unknown): string {
  const text = typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value))
  return text.replace(/[\r\n]+/g, ' ')
}

export const log = (...values: unknown[]) => console.log(...values.map(sanitize))
export const logWarn = (...values: unknown[]) => console.warn(...values.map(sanitize))
export const logError = (...values: unknown[]) => console.error(...values.map(sanitize))

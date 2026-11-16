const matchSupported = (candidate: string, supported: readonly string[]): string | undefined => {
  const wanted = candidate.toLowerCase()
  const exact = supported.find((language) => language.toLowerCase() === wanted)
  if (exact) return exact
  const base = wanted.split('-')[0]
  return supported.find((language) => language.toLowerCase() === base)
}

interface Detection {
  supported: readonly string[]
  fallback: string
  stored: string | null
  preferred: readonly string[]
}

/** The stored choice wins, then the browser's languages in order (`de-AT` matches `de`), then the fallback. */
export const detectLanguage = ({ supported, fallback, stored, preferred }: Detection): string => {
  for (const candidate of [stored, ...preferred]) {
    const match = candidate && matchSupported(candidate, supported)
    if (match) return match
  }
  return fallback
}

import { describe, expect, it } from 'vitest'
import { detectLanguage } from '@/shared/i18n/detect'

const detect = (overrides: Partial<Parameters<typeof detectLanguage>[0]>) =>
  detectLanguage({ supported: ['en', 'de'], fallback: 'en', stored: null, preferred: [], ...overrides })

describe('detectLanguage', () => {
  it('prefers the stored choice over the browser languages', () => {
    expect(detect({ stored: 'de', preferred: ['en-US'] })).toBe('de')
  })

  it('takes the first browser language that is supported', () => {
    expect(detect({ preferred: ['fr-FR', 'de-AT', 'en'] })).toBe('de')
  })

  it('matches a regional language to its base language, ignoring case', () => {
    expect(detect({ preferred: ['DE-ch'] })).toBe('de')
  })

  it('ignores a stored language that is no longer supported', () => {
    expect(detect({ stored: 'fr', preferred: ['de'] })).toBe('de')
  })

  it('falls back when nothing matches', () => {
    expect(detect({ stored: 'fr', preferred: ['es', 'it'] })).toBe('en')
  })

  it('does not match a base language to a more specific one', () => {
    expect(detect({ supported: ['en', 'en-XA'], preferred: ['en-GB'] })).toBe('en')
  })
})

import { describe, expect, it } from 'vitest'
import { pseudoLocalize, pseudoLocalizeCatalog } from '@/shared/i18n/pseudo'

describe('pseudoLocalize', () => {
  it('accents the letters, pads the text and brackets it', () => {
    const result = pseudoLocalize('Login')

    expect(result).toMatch(/^\[.+\]$/)
    expect(result).not.toContain('Login')
    expect(result.length).toBeGreaterThan('Login'.length + 2)
    expect(result).toContain('Ļöĝíñ')
  })

  it('leaves interpolation and nesting tokens for the library', () => {
    const result = pseudoLocalize('Waiting for {{count}} players, {{ready, number}} ready, see $t(shared:app.name)')

    expect(result).toContain('{{count}}')
    expect(result).toContain('{{ready, number}}')
    expect(result).toContain('$t(shared:app.name)')
    expect(result).not.toContain('players')
  })

  it('does not pad placeholders', () => {
    const plain = pseudoLocalize('{{count}}')

    expect(plain).toBe('[{{count}}]')
  })
})

describe('pseudoLocalizeCatalog', () => {
  const catalog = {
    title: 'Players',
    players_one: '{{count}} player',
    players_other: '{{count}} players',
    nested: { deep: 'Back' },
  }

  it('keeps every key, plural suffixes included', () => {
    const result = pseudoLocalizeCatalog(catalog)

    expect(Object.keys(result)).toEqual(Object.keys(catalog))
    expect(Object.keys(result.nested as object)).toEqual(['deep'])
  })

  it('keeps the placeholders of every plural form', () => {
    const result = pseudoLocalizeCatalog(catalog)

    expect(result.players_one).toContain('{{count}}')
    expect(result.players_other).toContain('{{count}}')
    expect(result.players_one).not.toBe(catalog.players_one)
  })

  it('does not change the catalog it is given', () => {
    const before = JSON.stringify(catalog)

    pseudoLocalizeCatalog(catalog)

    expect(JSON.stringify(catalog)).toBe(before)
  })
})

import { describe, expect, it } from 'vitest'
import { pseudoLocalizeCatalog } from '@/shared/i18n/pseudo'

type Catalog = { [key: string]: string | Catalog }

const files = import.meta.glob<Catalog>('/src/*/locales/*.json', { eager: true, import: 'default' })

const entries = Object.entries(files).map(([path, catalog]) => {
  const [, , namespace, , file] = path.split('/')
  return { path, namespace, language: file.replace('.json', ''), catalog }
})
const namespaces = [...new Set(entries.map((entry) => entry.namespace))]

const flatten = (catalog: Catalog, prefix = ''): Record<string, string> =>
  Object.entries(catalog).reduce<Record<string, string>>((flat, [key, value]) => {
    if (typeof value === 'string') flat[prefix + key] = value
    else Object.assign(flat, flatten(value, `${prefix}${key}.`))
    return flat
  }, {})

// Languages differ in their plural categories (English has _one and _other, Russian adds _few and _many)
const withoutPluralSuffix = (key: string) => key.replace(/_(zero|one|two|few|many|other)$/, '')
const baseKeys = (catalog: Catalog) => [...new Set(Object.keys(flatten(catalog)).map(withoutPluralSuffix))].sort()
const placeholders = (text: string) => (text.match(/\{\{[^}]*\}\}/g) ?? []).sort()

describe('locale catalogs', () => {
  it('finds the catalogs of every domain', () => {
    expect(namespaces).toEqual(expect.arrayContaining(['shared', 'user']))
  })

  describe.each(namespaces)('%s', (namespace) => {
    const ofNamespace = entries.filter((entry) => entry.namespace === namespace)
    const source = ofNamespace.find((entry) => entry.language === 'en')

    it('has a source-language catalog', () => {
      expect(source, `src/${namespace}/locales/en.json is missing`).toBeDefined()
    })

    it.each(ofNamespace.filter((entry) => entry.language !== 'en').map((entry) => entry.language))(
      '%s has the same keys as en',
      (language) => {
        const translated = ofNamespace.find((entry) => entry.language === language)!.catalog

        expect(baseKeys(translated)).toEqual(baseKeys(source!.catalog))
      },
    )

    it.each(ofNamespace.filter((entry) => entry.language !== 'en').map((entry) => entry.language))(
      '%s keeps the placeholders of en',
      (language) => {
        const translated = flatten(ofNamespace.find((entry) => entry.language === language)!.catalog)
        const original = flatten(source!.catalog)

        for (const [key, text] of Object.entries(translated)) {
          const sourceKey = original[key] === undefined ? withoutPluralSuffix(key) : key
          const sourceText = original[sourceKey] ?? original[`${sourceKey}_other`]
          expect(placeholders(text), key).toEqual(placeholders(sourceText ?? ''))
        }
      },
    )

    it('has no empty text', () => {
      for (const { path, catalog } of ofNamespace) {
        for (const [key, text] of Object.entries(flatten(catalog))) {
          expect(text.trim(), `${path}: ${key}`).not.toBe('')
        }
      }
    })

    it('gives the generated pseudo-locale exactly the keys of en', () => {
      const pseudo = pseudoLocalizeCatalog(source!.catalog)

      expect(Object.keys(flatten(pseudo)).sort()).toEqual(Object.keys(flatten(source!.catalog)).sort())
    })
  })
})

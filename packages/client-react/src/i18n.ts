import { type Catalogs, initI18n } from '@/shared/i18n'

type Catalog = Catalogs['source'][string]

// Each domain keeps its catalogs in <domain>/locales/<language>.json; the folder name is the namespace.
// The source language ships with the app, every other language is a separate chunk loaded when it is chosen.
const bundled = import.meta.glob<Catalog>('./*/locales/en.json', { eager: true, import: 'default' })
const onDemand = import.meta.glob<Catalog>(['./*/locales/*.json', '!./*/locales/en.json'], { import: 'default' })

const namespaceOf = (path: string) => path.split('/')[1]
const languageOf = (path: string) => path.split('/')[3].replace('.json', '')

export const i18nReady = initI18n({
  source: Object.fromEntries(Object.entries(bundled).map(([path, catalog]) => [namespaceOf(path), catalog])),
  languages: [...new Set(Object.keys(onDemand).map(languageOf))],
  load: async (language, namespace) => (await onDemand[`./${namespace}/locales/${language}.json`]?.()) ?? {},
})

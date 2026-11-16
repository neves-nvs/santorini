import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { detectLanguage } from './detect'
import { type Catalog, pseudoLocalizeCatalog } from './pseudo'

export const SOURCE_LANGUAGE = 'en'
export const PSEUDO_LANGUAGE = 'en-XA'
export const LANGUAGE_STORAGE_KEY = 'santorini.language'

export interface Catalogs {
  /** The source-language catalogs by namespace, bundled with the app. */
  source: Record<string, Catalog>
  /** The languages that have catalogs besides the source language. */
  languages: readonly string[]
  /** Fetches one catalog of one of those languages when it is first needed. */
  load: (language: string, namespace: string) => Promise<Catalog>
}

let catalogs: Catalogs
const loadedLanguages = new Set<string>([SOURCE_LANGUAGE])

// The pseudo-locale exists in development only, to catch strings that were never translated and layouts that overflow
export const getSupportedLanguages = (): string[] => [
  SOURCE_LANGUAGE,
  ...catalogs.languages,
  ...(import.meta.env.DEV ? [PSEUDO_LANGUAGE] : []),
]

const readStoredLanguage = (): string | null => {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY)
  } catch {
    return null
  }
}

const storeLanguage = (language: string) => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // private browsing or blocked storage: the choice only lasts until the page closes
  }
}

const syncDocument = (language: string) => {
  document.documentElement.lang = language
  document.title = i18n.t('app.title')
  document.querySelector('meta[name="description"]')?.setAttribute('content', i18n.t('app.description'))
}

const loadLanguage = async (language: string) => {
  if (loadedLanguages.has(language)) return
  await Promise.all(
    Object.entries(catalogs.source).map(async ([namespace, source]) => {
      const catalog = import.meta.env.DEV && language === PSEUDO_LANGUAGE ? pseudoLocalizeCatalog(source) : await catalogs.load(language, namespace)
      i18n.addResourceBundle(language, namespace, catalog, true, true)
    }),
  )
  loadedLanguages.add(language)
}

export const changeLanguage = async (language: string) => {
  if (!getSupportedLanguages().includes(language)) return
  await loadLanguage(language)
  await i18n.changeLanguage(language)
  storeLanguage(language)
}

export const initI18n = async (next: Catalogs) => {
  catalogs = next
  loadedLanguages.clear()
  loadedLanguages.add(SOURCE_LANGUAGE)

  await i18n.use(initReactI18next).init({
    resources: { [SOURCE_LANGUAGE]: next.source },
    lng: SOURCE_LANGUAGE,
    fallbackLng: SOURCE_LANGUAGE,
    defaultNS: 'shared',
    ns: Object.keys(next.source),
    interpolation: { escapeValue: false },
    // every namespace of the active language is loaded before the first render, so nothing needs to suspend
    react: { useSuspense: false },
  })
  i18n.on('languageChanged', syncDocument)

  const language = detectLanguage({
    supported: getSupportedLanguages(),
    fallback: SOURCE_LANGUAGE,
    stored: readStoredLanguage(),
    preferred: navigator.languages,
  })
  await loadLanguage(language)
  await i18n.changeLanguage(language)
}

export { i18n }

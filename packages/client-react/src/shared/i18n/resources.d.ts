import type shared from '@/shared/locales/en.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'shared'
  }
  interface ResourceNamespaceMap {
    shared: typeof shared
  }
}

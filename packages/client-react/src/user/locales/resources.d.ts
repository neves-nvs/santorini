import type user from '@/user/locales/en.json'

declare module 'i18next' {
  interface ResourceNamespaceMap {
    user: typeof user
  }
}

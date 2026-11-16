import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { changeLanguage, getSupportedLanguages, PSEUDO_LANGUAGE } from '@/shared/i18n'

// Each language is named in itself, so a reader who cannot read the current language can still find theirs
const languageName = (language: string, pseudoName: string) =>
  language === PSEUDO_LANGUAGE ? pseudoName : (new Intl.DisplayNames([language], { type: 'language' }).of(language) ?? language)

export const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation()
  const selectId = useId()
  const languages = getSupportedLanguages()

  if (languages.length < 2) return null

  return (
    <div className="language-switcher">
      <label htmlFor={selectId}>{t('language.label')}</label>
      <select id={selectId} value={i18n.language} onChange={(event) => void changeLanguage(event.target.value)}>
        {languages.map((language) => (
          <option key={language} value={language} lang={language}>
            {languageName(language, t('language.pseudo'))}
          </option>
        ))}
      </select>
    </div>
  )
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { i18nReady } from './i18n.ts'
import { logError } from '@/shared/utils/log'
import './index.css'

// The page renders once the catalogs of the chosen language are loaded; if that fails the keys show instead of a blank page
i18nReady
  .catch((error) => logError('Could not load the translations:', error))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })

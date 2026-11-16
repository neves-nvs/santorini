import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import NotFoundPage from '@/shared/pages/NotFoundPage'
import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher'
import { changeLanguage, i18n, LANGUAGE_STORAGE_KEY } from '@/shared/i18n'
import { pseudoLocalize } from '@/shared/i18n/pseudo'
import AuthPage from '@/user/view/AuthPage'

const switchTo = (language: string) => act(() => changeLanguage(language))

afterEach(async () => {
  vi.unstubAllEnvs()
  await switchTo('en')
  localStorage.clear()
})

describe('rendering in another language', () => {
  it('shows the source language by default', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('translates shared components when the language changes', async () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>)

    await switchTo('en-XA')

    expect(screen.getByRole('heading', { name: pseudoLocalize('Page not found') })).toBeInTheDocument()
    expect(screen.queryByText('Page not found')).not.toBeInTheDocument()
  })

  it('translates the user domain through its own namespace', async () => {
    render(<MemoryRouter><AuthPage /></MemoryRouter>)

    await switchTo('en-XA')

    expect(screen.getByLabelText(pseudoLocalize('Username'))).toBeInTheDocument()
    expect(screen.getByLabelText(pseudoLocalize('Password'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: pseudoLocalize('Login') })).toBeInTheDocument()
  })

  it('goes back to the source language', async () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>)
    await switchTo('en-XA')

    await switchTo('en')

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})

describe('fallback', () => {
  it('uses the source text for a key the language lacks', async () => {
    i18n.addResourceBundle('xx', 'shared', { notFound: { title: 'Seite nicht gefunden' } })
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>)

    await act(() => i18n.changeLanguage('xx'))

    expect(screen.getByRole('heading', { name: 'Seite nicht gefunden' })).toBeInTheDocument()
    expect(screen.getByText('There is nothing at this address.')).toBeInTheDocument()
  })

  it('ignores a language that has no catalogs', async () => {
    await switchTo('tlh')

    expect(i18n.language).toBe('en')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull()
  })
})

describe('the document', () => {
  it('follows the language in lang, title and description', async () => {
    document.head.insertAdjacentHTML('beforeend', '<meta name="description" content="">')

    await switchTo('en-XA')

    expect(document.documentElement.lang).toBe('en-XA')
    expect(document.title).toBe(pseudoLocalize('Santorini - Board Game'))
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain('[')
    document.querySelector('meta[name="description"]')?.remove()
  })

  it('remembers the choice', async () => {
    await switchTo('en-XA')

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en-XA')
  })
})

describe('LanguageSwitcher', () => {
  it('lists the languages, each named in itself, and switches on selection', async () => {
    render(<LanguageSwitcher />)

    const select = screen.getByRole('combobox', { name: 'Language' })
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument()

    fireEvent.change(select, { target: { value: 'en-XA' } })

    await waitFor(() => expect(i18n.language).toBe('en-XA'))
    expect(screen.getByRole('combobox', { name: pseudoLocalize('Language') })).toHaveValue('en-XA')
  })

  it('renders nothing when there is only one language', () => {
    vi.stubEnv('DEV', false)

    const { container } = render(<LanguageSwitcher />)

    expect(container).toBeEmptyDOMElement()
  })
})

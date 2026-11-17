import { MemoryRouter } from 'react-router-dom'
import { USERNAME_RULE } from '@santorini/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AuthPage from '@/user/view/AuthPage'
import { userApi } from '@/user/services/userApi'

vi.mock('@/user/services/userApi', () => ({
  userApi: { login: vi.fn(), createUser: vi.fn(), checkAuth: vi.fn() },
}))

function renderPage() {
  render(
    <MemoryRouter>
      <AuthPage />
    </MemoryRouter>
  )
}

function fill(username: string, password: string) {
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: username } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
}

function switchToRegister() {
  fireEvent.click(screen.getByRole('button', { name: /need an account\? register/i }))
}

describe('AuthPage', () => {
  beforeEach(() => {
    vi.mocked(userApi.login).mockReset().mockResolvedValue('OK')
    vi.mocked(userApi.createUser).mockReset().mockResolvedValue({} as never)
    vi.mocked(userApi.checkAuth).mockReset().mockResolvedValue(null)
  })

  it('shows the username rule next to the field when registering', () => {
    renderPage()
    expect(screen.queryByText(USERNAME_RULE)).not.toBeInTheDocument()

    switchToRegister()

    const hint = screen.getByText(USERNAME_RULE)
    expect(screen.getByLabelText('Username')).toHaveAccessibleDescription(USERNAME_RULE)
    expect(hint).toBeVisible()
  })

  it('does not send a username that breaks the rule, and says why', async () => {
    renderPage()
    switchToRegister()

    fill('not a name', 'long-enough-password')
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(USERNAME_RULE)
    expect(userApi.createUser).not.toHaveBeenCalled()
  })

  it('does not send a password that is too short', async () => {
    renderPage()
    switchToRegister()

    fill('casey', 'short')
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Password must be at least 8 characters')
    expect(userApi.createUser).not.toHaveBeenCalled()
  })

  it('registers a valid name, whatever its case', async () => {
    renderPage()
    switchToRegister()

    fill('  Casey ', 'long-enough-password')
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    await waitFor(() => expect(userApi.createUser).toHaveBeenCalledTimes(1))
  })

  it('does not send a login with a name that breaks the rule', async () => {
    renderPage()

    fill('Name With Spaces', 'whatever')
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(USERNAME_RULE)
    expect(userApi.login).not.toHaveBeenCalled()
  })

  it('signs in a valid name, whatever its case', async () => {
    renderPage()

    fill(' Casey ', 'whatever')
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => expect(userApi.login).toHaveBeenCalledTimes(1))
  })
})

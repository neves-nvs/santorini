import { randomUUID } from 'node:crypto'
import AxeBuilder from '@axe-core/playwright'
import { test, expect, Cookie, Page } from '@playwright/test'

const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze()
  expect(violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target).join(', ')}`)).toEqual([])
}

async function registerUser(page: Page) {
  await page.goto('/auth')
  await page.getByRole('button', { name: /need an account\? register/i }).click()
  await page.getByLabel('Username').fill(`a11y-${randomUUID().slice(0, 8)}`)
  await page.getByLabel('Password').fill('e2e-password')
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await page.waitForURL('/lobby')
}

// The server limits registrations and logins, so the signed-in pages share one account
function useSignedInUser() {
  let cookies: Cookie[] = []

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    await registerUser(await context.newPage())
    cookies = await context.cookies()
    await context.close()
  })

  test.beforeEach(async ({ context }) => {
    await context.addCookies(cookies)
  })
}

test.describe('Document head', () => {
  test('describes the page and does not ship the Vite favicon', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Santorini/)
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', /^#[0-9a-f]{6}$/i)
    await expect(page.locator('link[rel="icon"]')).not.toHaveAttribute('href', /vite\.svg/)
  })
})

test.describe('Unknown routes', () => {
  test('show a not-found page with a way home', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')

    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    await page.getByRole('link', { name: 'Back to Home' }).click()
    await expect(page).toHaveURL('/')
  })

  test('have no accessibility violations', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
    await expectNoAxeViolations(page)
  })
})

test.describe('Home page', () => {
  test('navigates with links, not buttons nested in links', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('a button')).toHaveCount(0)
    await page.getByRole('link', { name: 'Login / Register' }).click()
    await expect(page).toHaveURL('/auth')
  })

  test('has no accessibility violations', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Santorini' })).toBeVisible()
    await expectNoAxeViolations(page)
  })
})

test.describe('Auth page', () => {
  test('labels its fields', async ({ page }) => {
    await page.goto('/auth')

    await expect(page.getByLabel('Username')).toHaveAttribute('autocomplete', 'username')
    await expect(page.getByLabel('Password')).toHaveAttribute('autocomplete', 'current-password')
  })

  test('announces a failed login and ties it to the fields', async ({ page }) => {
    await page.goto('/auth')
    await page.getByLabel('Username').fill(`nobody-${randomUUID().slice(0, 8)}`)
    await page.getByLabel('Password').fill('wrong-password')
    await page.getByRole('button', { name: 'Login', exact: true }).click()

    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    const message = (await alert.textContent()) ?? ''
    await expect(page.getByLabel('Username')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Username')).toHaveAccessibleDescription(message)
    await expect(page.getByLabel('Password')).toHaveAccessibleDescription(message)
    await expectNoAxeViolations(page)
  })

  test('shows a visible focus ring when tabbing', async ({ page }) => {
    await page.goto('/auth')
    await expect(page.getByRole('heading', { level: 1, name: 'Login' })).toBeVisible()

    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Username')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Password')).toBeFocused()
    await page.keyboard.press('Tab')
    const submit = page.getByRole('button', { name: 'Login', exact: true })
    await expect(submit).toBeFocused()
    await expect(submit).toHaveCSS('outline-style', 'solid')
    await expect(submit).toHaveCSS('outline-width', '3px')
  })

  test('has no accessibility violations', async ({ page }) => {
    await page.goto('/auth')
    await expect(page.getByRole('heading', { level: 1, name: 'Login' })).toBeVisible()
    await expectNoAxeViolations(page)
  })
})

test.describe('Lobby page', () => {
  useSignedInUser()

  test('labels the player count and marks the active tab', async ({ page }) => {
    await page.goto('/lobby')

    await expect(page.getByLabel('Number of Players')).toHaveValue('2')
    await expect(page.getByRole('button', { name: /^Available/ })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: /^My Games/ }).click()
    await expect(page.getByRole('button', { name: /^My Games/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: /^Available/ })).toHaveAttribute('aria-pressed', 'false')
  })

  test('announces a failure to fetch games', async ({ page }) => {
    await page.goto('/lobby')
    await page.route('**/games', (route) => route.fulfill({ status: 500, body: '{}' }))
    await page.getByRole('button', { name: 'Refresh' }).click()

    await expect(page.getByRole('alert')).toHaveText(/Failed to fetch games/)
  })

  test('names each game button after its game and has no accessibility violations', async ({ page }) => {
    await page.goto('/lobby')
    await page.getByRole('button', { name: 'Create Game' }).click()
    await page.waitForURL(/\/game\/\d+/)
    await page.goto('/lobby')

    await expect(page.getByRole('button', { name: /^(Enter|Resume|View|Join) game \d+$/ })).toBeVisible()
    await expectNoAxeViolations(page)
  })
})

test.describe('Game page', () => {
  useSignedInUser()

  test('gives the 3D board a text alternative and announces the status', async ({ page }) => {
    await page.goto('/lobby')
    await page.getByRole('button', { name: 'Create Game' }).click()
    await page.waitForURL(/\/game\/\d+/)

    await expect(page.getByRole('img', { name: /3D Santorini board/ })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: /\S/ })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Game' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Santorini game' })).toBeAttached()
    await expectNoAxeViolations(page)
  })
})

test.describe('Page titles', () => {
  test('tell the routes apart', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Board Game - Santorini')

    await page.getByRole('link', { name: 'Login / Register' }).click()
    await expect(page).toHaveTitle('Login - Santorini')
    await page.getByRole('button', { name: /need an account\? register/i }).click()
    await expect(page).toHaveTitle('Register - Santorini')

    await page.goto('/this-route-does-not-exist')
    await expect(page).toHaveTitle('Page not found - Santorini')
  })
})

test.describe('Signed-in polish', () => {
  useSignedInUser()

  const KEYBOARD_NOTICE = /Keyboard play isn't available yet/

  async function openNewGame(page: Page): Promise<string> {
    await page.goto('/lobby')
    await page.getByRole('button', { name: 'Create Game' }).click()
    await page.waitForURL(/\/game\/\d+/)
    await expect(page.getByRole('img', { name: /3D Santorini board/ })).toBeVisible()
    return page.url().split('/game/')[1]
  }

  async function pressOnPageBackground(page: Page, key: string) {
    await page.locator('body').click({ position: { x: 1, y: 1 } })
    await page.keyboard.press(key)
  }

  test('titles the lobby and the game', async ({ page }) => {
    await page.goto('/lobby')
    await expect(page).toHaveTitle('Lobby - Santorini')

    const gameId = await openNewGame(page)

    await expect(page).toHaveTitle(`Game ${gameId} - Santorini`)
  })

  test('says once that keyboard play is not available when a play key is pressed', async ({ page }) => {
    await openNewGame(page)
    await expect(page.getByRole('img', { name: /3D Santorini board/ })).toBeVisible()

    await page.keyboard.press('Tab')
    await expect(page.getByText(KEYBOARD_NOTICE)).toHaveCount(0)

    await pressOnPageBackground(page, 'ArrowDown')
    await expect(page.getByRole('status').getByText(KEYBOARD_NOTICE)).toBeVisible()

    await page.keyboard.press('ArrowDown')
    await expect(page.getByText(KEYBOARD_NOTICE)).toHaveCount(1)
  })

  test('stops animating the notice when the user prefers reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openNewGame(page)
    await pressOnPageBackground(page, 'Enter')

    const notice = page.getByText(KEYBOARD_NOTICE).locator('..')
    await expect(notice).toBeVisible()
    await expect(notice).toHaveCSS('transition-duration', '0s')
  })

  test('animates the notice when motion is not reduced', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await openNewGame(page)
    await pressOnPageBackground(page, 'Enter')

    await expect(page.getByText(KEYBOARD_NOTICE).locator('..')).toHaveCSS('transition-duration', '0.3s')
  })

  test('keeps the debug panels accessible when they are open', async ({ page }) => {
    await openNewGame(page)
    await page.getByRole('button', { name: 'DEBUG' }).click()
    await page.keyboard.press('Control+Shift+P')
    await expect(page.getByRole('heading', { name: 'Performance Monitor' })).toBeVisible()

    await expectNoAxeViolations(page)
    await expect(page.getByRole('button', { name: 'Close performance monitor' })).toBeVisible()
  })
})

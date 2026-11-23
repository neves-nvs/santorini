import { randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

async function registerUser(page: Page) {
  await page.goto('/auth')
  await page.getByRole('button', { name: /need an account\? register/i }).click()
  await page.getByLabel('Username').fill(`ui-review-${randomUUID().slice(0, 8)}`)
  await page.getByLabel('Password').fill('e2e-password')
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await page.waitForURL('/lobby')
}

test('capture auth, lobby, and game screen for PR visual review', async ({ page }, testInfo) => {
  const screenshotPath = (name: string) => testInfo.outputPath(`${testInfo.project.name}-${name}.png`)

  await page.goto('/auth')
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible()
  await page.screenshot({ path: screenshotPath('auth'), fullPage: true })

  await registerUser(page)
  await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible()
  await page.screenshot({ path: screenshotPath('lobby'), fullPage: true })

  await page.getByRole('button', { name: /create game/i }).click()
  await page.waitForURL(/\/game\/\d+/)
  await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible()
  await page.screenshot({ path: screenshotPath('game'), fullPage: false })
})

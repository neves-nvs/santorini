import { test, expect } from '@playwright/test'

// The pseudo-locale is generated from English and only exists in development builds, which is what this suite runs against
const PSEUDO_TAGLINE = /^\[Ţĥé Šţŕáţéĝíç Ɓöáŕð Ĝáɱé íñ 3Ð/
const PSEUDO_USERNAME = /Üšéŕñáɱé/

test.describe('Language', () => {
  test('starts in English', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { name: 'The Strategic Board Game in 3D' })).toBeVisible()
    await expect(page).toHaveTitle('Santorini - Board Game')
  })

  test('switching the language changes the page, the document and survives a reload', async ({ page }) => {
    await page.goto('/')

    await page.getByLabel('Language').selectOption('en-XA')

    await expect(page.locator('html')).toHaveAttribute('lang', 'en-XA')
    await expect(page.getByRole('heading', { name: PSEUDO_TAGLINE })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'The Strategic Board Game in 3D' })).toHaveCount(0)
    await expect(page).toHaveTitle(/^\[/)

    await page.reload()

    await expect(page.locator('html')).toHaveAttribute('lang', 'en-XA')
    await expect(page.getByRole('heading', { name: PSEUDO_TAGLINE })).toBeVisible()
    await expect(page.getByRole('combobox', { name: /Ļáñĝüáĝé/ })).toHaveValue('en-XA')
  })

  test('the choice applies to other pages, other domains included', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Language').selectOption('en-XA')

    await page.goto('/auth')

    await expect(page.getByLabel(PSEUDO_USERNAME)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Login' })).toHaveCount(0)
  })

  test('switching back restores English', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Language').selectOption('en-XA')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-XA')

    await page.getByRole('combobox', { name: /Ļáñĝüáĝé/ }).selectOption('en')

    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { name: 'The Strategic Board Game in 3D' })).toBeVisible()
  })
})

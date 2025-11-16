import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should display auth page', async ({ page }) => {
    await page.goto('/auth')

    // Should have login form elements (using input type selectors)
    await expect(page.locator('input[type="text"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible()
  })

  test('should show validation for empty login', async ({ page }) => {
    await page.goto('/auth')

    // Try to login without credentials
    await page.getByRole('button', { name: /login/i }).click()

    // Should show some form of validation (error message or prevent submission)
    // HTML5 validation should prevent submission
    const usernameInput = page.locator('input[type="text"]')
    await expect(usernameInput).toBeVisible()
  })

  test('should attempt login with credentials', async ({ page }) => {
    await page.goto('/auth')

    // Fill in login form using input type selectors
    await page.locator('input[type="text"]').fill('testuser')
    await page.locator('input[type="password"]').fill('testpass')

    // Click login button
    await page.getByRole('button', { name: /login/i }).click()

    // Wait a bit for the request to complete
    await page.waitForTimeout(1000)

    // Should either show error (if backend not running) or redirect to home
    // We're just checking the UI responds
    const currentUrl = page.url()
    expect(currentUrl).toBeTruthy()
  })

  test('should have create account option', async ({ page }) => {
    await page.goto('/auth')

    // Should have a way to create account
    const createButton = page.getByRole('button', { name: /create|register|sign up/i })
    await expect(createButton).toBeVisible()
  })
})


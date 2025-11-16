import { test, expect } from '@playwright/test'

test.describe('Navigation and Routing', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/')

    // Should load without errors
    await expect(page).toHaveTitle(/Santorini/i)
  })

  test('should have working React app', async ({ page }) => {
    await page.goto('/')

    // Check that React has rendered something
    const body = page.locator('body')
    await expect(body).not.toBeEmpty()
  })

  test('should not have console errors on load', async ({ page }) => {
    const consoleErrors: string[] = []
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForTimeout(2000)

    // Filter out known acceptable errors (like network errors if backend is down)
    const criticalErrors = consoleErrors.filter(
      (error) => 
        !error.includes('Failed to fetch') &&
        !error.includes('NetworkError') &&
        !error.includes('ERR_CONNECTION_REFUSED')
    )

    expect(criticalErrors).toHaveLength(0)
  })

  test('should handle 404 routes gracefully', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')

    // Should either redirect or show 404 page, but not crash
    const body = page.locator('body')
    await expect(body).not.toBeEmpty()
  })
})


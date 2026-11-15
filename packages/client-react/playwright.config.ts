import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/support/require-stack.ts',
  fullyParallel: false, // Run tests sequentially for multi-player tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for consistent test state
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60000, // 60 second timeout per test
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: process.env.SMOKE_BROWSER_CHANNEL || undefined },
    },
  ],
})


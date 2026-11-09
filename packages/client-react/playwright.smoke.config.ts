import { defineConfig, devices } from "@playwright/test";

// Drives an already running client and server (see scripts/smoke), so it does not start any.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "dev-setup.spec.ts",
  timeout: 60000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5174",
    trace: "retain-on-failure",
    // Set SMOKE_BROWSER_CHANNEL=chrome to use an installed Google Chrome instead of downloading Chromium.
    channel: process.env.SMOKE_BROWSER_CHANNEL || undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

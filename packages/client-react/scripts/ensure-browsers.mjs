import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { chromium, firefox, webkit } from '@playwright/test'

const browsers = [
  ['Chromium', chromium],
  ['WebKit', webkit],
  ['Firefox', firefox],
]
const installCommand = 'npx playwright install chromium webkit firefox'

async function missingBrowsers() {
  const missing = []
  for (const [name, browserType] of browsers) {
    try {
      const browser = await browserType.launch()
      await browser.close()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes("Executable doesn't exist") || message.includes('is not found at')) {
        missing.push(name)
      } else {
        throw error
      }
    }
  }
  return missing
}

async function confirmInstall(names) {
  if (!process.stdin.isTTY) return false
  const terminal = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await terminal.question(`${names.join(', ')} is not installed. Run "${installCommand}" now? [y/N] `)
    return /^y(es)?$/i.test(answer.trim())
  } finally {
    terminal.close()
  }
}

const missing = await missingBrowsers()
if (missing.length === 0) process.exit(0)

if (!(await confirmInstall(missing))) {
  console.error(`Missing Playwright browser engines: ${missing.join(', ')}. Install them with: ${installCommand}`)
  process.exit(1)
}

const installed = spawnSync('npx', ['playwright', 'install', 'chromium', 'webkit', 'firefox'], { stdio: 'inherit' })
if (installed.status !== 0 || (await missingBrowsers()).length > 0) {
  console.error('One or more Playwright browser engines could not be installed.')
  process.exit(1)
}

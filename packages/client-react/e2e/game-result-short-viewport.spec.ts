import { readFile } from 'node:fs/promises'
import { test, expect } from '@playwright/test'

const panelCss = await readFile(new URL('../src/game/view/components/GameResultPanel.css', import.meta.url), 'utf8')

test('game result actions remain reachable in a short viewport', async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 240 })
  await page.setContent(`
    <style>
      html, body { margin: 0; font: 16px Arial, sans-serif; }
      ${panelCss}
    </style>
    <nav style="position:fixed;top:0;left:0;z-index:1200">Game navigation</nav>
    <div class="game-result-scrim">
      <section class="game-result-panel">
        <span class="game-result-mark" aria-hidden="true">★</span>
        <p class="game-result-eyebrow">Game complete</p>
        <h2 class="game-result-title">You won!</h2>
        <p class="game-result-description">The other player had no legal moves.</p>
        <div class="game-result-actions">
          <a class="game-result-primary" href="#lobby">Find another game</a>
          <a class="game-result-secondary" href="#home">Home</a>
        </div>
      </section>
    </div>
  `)

  const scrim = page.locator('.game-result-scrim')
  await expect(scrim).toHaveCSS('overflow-y', 'auto')
  expect(await scrim.evaluate((node) => node.scrollHeight)).toBeGreaterThan(
    await scrim.evaluate((node) => node.clientHeight),
  )

  const lobbyLink = page.getByRole('link', { name: 'Find another game' })
  await lobbyLink.scrollIntoViewIfNeeded()
  await expect(lobbyLink).toBeInViewport()
  await page.getByRole('link', { name: 'Home' }).scrollIntoViewIfNeeded()
  await expect(page.getByRole('link', { name: 'Home' })).toBeInViewport()
})

test('game result actions remain reachable at 200% zoom', async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 480 })
  await page.setContent(`
    <style>
      html, body { margin: 0; font: 16px Arial, sans-serif; }
      ${panelCss}
    </style>
    <div class="game-result-scrim">
      <section class="game-result-panel">
        <span class="game-result-mark" aria-hidden="true">★</span>
        <p class="game-result-eyebrow">Game complete</p>
        <h2 class="game-result-title">You won!</h2>
        <p class="game-result-description">The other player had no legal moves.</p>
        <div class="game-result-actions">
          <a class="game-result-primary" href="#lobby">Find another game</a>
          <a class="game-result-secondary" href="#home">Home</a>
        </div>
      </section>
    </div>
  `)
  await page.evaluate(() => { document.documentElement.style.zoom = '2' })

  const lobbyLink = page.getByRole('link', { name: 'Find another game' })
  await lobbyLink.scrollIntoViewIfNeeded()
  await expect(lobbyLink).toBeInViewport()
  const homeLink = page.getByRole('link', { name: 'Home' })
  await homeLink.scrollIntoViewIfNeeded()
  await expect(homeLink).toBeInViewport()
})

import { randomUUID } from 'node:crypto'
import { test, expect, Page } from '@playwright/test'

// Registers a new user through the UI; the client then logs in and opens the lobby
async function registerUser(page: Page, role: string): Promise<void> {
  const username = `${role}-${randomUUID().slice(0, 8)}`
  await page.goto('/auth')
  await page.getByRole('button', { name: /need an account\? register/i }).click()
  await page.locator('input[type="text"]').fill(username)
  await page.locator('input[type="password"]').fill('e2e-password')
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await page.waitForURL('/lobby')
}

// Helper to create a new game and return the game ID
async function createGame(page: Page, playerCount: number = 2): Promise<string> {
  await page.goto('/lobby')
  
  // Select player count
  await page.locator('select').selectOption(playerCount.toString())
  
  // Click create game
  await page.getByRole('button', { name: /create game/i }).click()
  
  // Wait for navigation to game page
  await page.waitForURL(/\/game\/\d+/)
  
  // Extract game ID from URL
  const url = page.url()
  const gameId = url.split('/game/')[1]
  return gameId
}

test.describe('Game Join and Ready Flow', () => {

  test('user can create a game and see lobby', async ({ page }) => {
    await registerUser(page, 'player-one')

    const gameId = await createGame(page)
    expect(gameId).toBeTruthy()

    // Should see game lobby heading
    await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible()
  })

  test('user can see player list in game', async ({ page }) => {
    await registerUser(page, 'player-one')
    await createGame(page)

    // Should see player list heading
    await expect(page.getByRole('heading', { name: /Players \(\d+\/\d+\)/ })).toBeVisible()
  })
})

test.describe('Two Player Join and Ready Flow', () => {
  test('player 1 UI updates when player 2 joins', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    try {
      // Player 1 creates game
      await registerUser(page1, 'player-one')
      const gameId = await createGame(page1)

      // Player 1 should see 1/2 players
      await expect(page1.getByRole('heading', { name: 'Players (1/2)' })).toBeVisible()

      // Player 2 joins
      await registerUser(page2, 'player-two')
      await page2.goto(`/game/${gameId}`)
      await page2.waitForURL(`/game/${gameId}`)

      // Player 1 should see UI update to 2/2 players (real-time WebSocket update)
      await expect(page1.getByRole('heading', { name: 'Players (2/2)' })).toBeVisible()

      // Player 2 should also see 2/2
      await expect(page2.getByRole('heading', { name: 'Players (2/2)' })).toBeVisible()
    } finally {
      await context1.close()
      await context2.close()
    }
  })

  test('players can mark ready and game starts', async ({ browser }) => {
    // Create two separate browser contexts
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    try {
      // Player 1 logs in and creates a game
      await registerUser(page1, 'player-one')
      const gameId = await createGame(page1)

      // Player 2 logs in and joins
      await registerUser(page2, 'player-two')
      await page2.goto(`/game/${gameId}`)

      await expect(page1.getByRole('heading', { name: 'Players (2/2)' })).toBeVisible()
      await expect(page2.getByRole('heading', { name: 'Players (2/2)' })).toBeVisible()

      await page1.getByRole('button', { name: /ready/i }).click()
      await page2.getByRole('button', { name: /ready/i }).click()

      // Once every player is ready the game starts and the waiting room goes away for both
      await expect(page1.getByRole('heading', { name: 'Game Lobby' })).toBeHidden()
      await expect(page2.getByRole('heading', { name: 'Game Lobby' })).toBeHidden()
    } finally {
      await context1.close()
      await context2.close()
    }
  })
})


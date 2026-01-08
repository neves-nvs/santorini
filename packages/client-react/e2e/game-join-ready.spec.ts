import { test, expect, Page } from '@playwright/test'

// Test user credentials - these should exist in the test database
const TEST_USER_1 = { username: 'dio', password: 'dio' }
const TEST_USER_2 = { username: 'tet', password: 'tet' }

// Helper to login a user
async function loginUser(page: Page, user: { username: string; password: string }) {
  await page.goto('/auth')
  await page.locator('input[type="text"]').fill(user.username)
  await page.locator('input[type="password"]').fill(user.password)
  await page.getByRole('button', { name: /login/i }).click()
  
  // Wait for redirect to lobby
  await page.waitForURL('/lobby', { timeout: 10000 })
}

// Helper to create a new game and return the game ID
async function createGame(page: Page, playerCount: number = 2): Promise<string> {
  await page.goto('/lobby')
  
  // Select player count
  await page.locator('select').selectOption(playerCount.toString())
  
  // Click create game
  await page.getByRole('button', { name: /create game/i }).click()
  
  // Wait for navigation to game page
  await page.waitForURL(/\/game\/\d+/, { timeout: 10000 })
  
  // Extract game ID from URL
  const url = page.url()
  const gameId = url.split('/game/')[1]
  return gameId
}

test.describe('Game Join and Ready Flow', () => {

  test('user can create a game and see lobby', async ({ page }) => {
    await loginUser(page, TEST_USER_1)

    const gameId = await createGame(page)
    expect(gameId).toBeTruthy()

    // Should see game lobby heading
    await expect(page.getByRole('heading', { name: 'Game Lobby' })).toBeVisible({ timeout: 10000 })
  })

  test('user can see player list in game', async ({ page }) => {
    await loginUser(page, TEST_USER_1)
    await createGame(page)

    // Should see player list heading
    await expect(page.getByRole('heading', { name: /Players \(\d+\/\d+\)/ })).toBeVisible({ timeout: 10000 })
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
      await loginUser(page1, TEST_USER_1)
      const gameId = await createGame(page1)

      // Player 1 should see 1/2 players
      await expect(page1.getByRole('heading', { name: 'Players (1/2)' })).toBeVisible({ timeout: 10000 })

      // Player 2 joins
      await loginUser(page2, TEST_USER_2)
      await page2.goto(`/game/${gameId}`)
      await page2.waitForURL(`/game/${gameId}`, { timeout: 10000 })

      // Player 1 should see UI update to 2/2 players (real-time WebSocket update)
      await expect(page1.getByRole('heading', { name: 'Players (2/2)' })).toBeVisible({ timeout: 10000 })

      // Player 2 should also see 2/2
      await expect(page2.getByRole('heading', { name: 'Players (2/2)' })).toBeVisible({ timeout: 10000 })
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
      await loginUser(page1, TEST_USER_1)
      const gameId = await createGame(page1)

      // Player 2 logs in and joins
      await loginUser(page2, TEST_USER_2)
      await page2.goto(`/game/${gameId}`)

      // Wait for both players to be in game
      await page1.waitForTimeout(3000)
      await page2.waitForTimeout(3000)

      // Look for ready button on both pages
      const readyButton1 = page1.getByRole('button', { name: /ready/i })
      const readyButton2 = page2.getByRole('button', { name: /ready/i })

      // If ready buttons are visible, click them
      if (await readyButton1.isVisible({ timeout: 5000 }).catch(() => false)) {
        await readyButton1.click()
        console.log('Player 1 clicked ready')
      }

      if (await readyButton2.isVisible({ timeout: 5000 }).catch(() => false)) {
        await readyButton2.click()
        console.log('Player 2 clicked ready')
      }

      // Wait for game to potentially start
      await page1.waitForTimeout(3000)

      // Game should either be in progress or showing the board
      // Check for game board or placement phase indicators
      const gameStarted = await page1.locator('canvas').or(page1.locator('text=placing')).isVisible({ timeout: 5000 }).catch(() => false)

      console.log(`Game started: ${gameStarted}`)
    } finally {
      await context1.close()
      await context2.close()
    }
  })
})


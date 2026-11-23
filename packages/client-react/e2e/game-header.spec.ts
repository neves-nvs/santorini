import { expect, test } from '@playwright/test'
import type { Locator, WebSocketRoute } from '@playwright/test'

const gameView = {
  gameId: 5,
  version: 1,
  status: 'in-progress',
  phase: 'placing',
  currentSeat: 0,
  turnNumber: 1,
  maxPlayers: 2,
  board: {
    cells: Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => ({ height: 0, hasDome: false, worker: null })),
    ),
  },
  players: [{ userId: 1, isReady: true }, { userId: 2, isReady: true }],
  viewer: { role: 'player', isCurrentPlayer: false, availableMoves: [] },
  winnerUserId: null,
  winReason: null,
}

async function bounds(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('Expected a visible element')
  return box
}

for (const viewport of [{ width: 375, height: 667 }, { width: 844, height: 390 }]) {
  test.describe(`game header at ${viewport.width} × ${viewport.height}`, () => {
    test.use({ viewport })

    test('keeps phase and connection feedback clear of the game navigation', async ({ page }) => {
      const firstSubscription = Promise.withResolvers<{ acknowledge: () => void; socket: WebSocketRoute }>()
      const secondSubscription = Promise.withResolvers<() => void>()
      let connectionCount = 0
      await page.route('**/api/me', (route) => route.fulfill({ json: { id: 1, username: 'a_player_with_a_long_name' } }))
      await page.route('**/api/games/5', (route) => route.fulfill({ json: gameView }))
      await page.route('**/api/ws-ticket', (route) => route.fulfill({ json: { ticket: 'test-ticket' } }))
      await page.routeWebSocket('**/ws?*', (socket) => {
        const isFirstSocket = ++connectionCount === 1
        socket.onMessage((raw) => {
          const { type, id } = JSON.parse(String(raw))
          if (type === 'join_game') {
            socket.send(JSON.stringify({ type: 'ok', id, payload: { gameId: 5 } }))
          }
          if (type === 'subscribe_game') {
            const acknowledge = () => {
              const payload = isFirstSocket ? gameView : { ...gameView, version: 2, phase: 'moving' }
              socket.send(JSON.stringify({ type: 'game_state', payload }))
              socket.send(JSON.stringify({ type: 'ok', id, payload: { gameId: 5 } }))
            }
            if (isFirstSocket) firstSubscription.resolve({ acknowledge, socket })
            else secondSubscription.resolve(acknowledge)
          }
        })
      })

      await page.goto('/game/5')
      const { acknowledge, socket } = await firstSubscription.promise
      const navigation = page.getByRole('navigation', { name: 'Game' })
      const back = navigation.getByRole('link', { name: 'Back to Lobby' })
      await expect(back).toBeVisible()
      expect((await bounds(back)).height).toBeGreaterThanOrEqual(44)

      const sync = page.getByText('Syncing game…', { exact: true })
      await expect(sync).toBeVisible()
      const nav = await bounds(navigation)
      const expectNoOverlap = async (label: Locator) => {
        const box = await bounds(label)
        if (viewport.width < viewport.height) {
          expect(box.y).toBeGreaterThanOrEqual(nav.y + nav.height)
        } else {
          expect(box.x).toBeGreaterThanOrEqual(nav.x + nav.width)
        }
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
      }

      await expectNoOverlap(sync)
      acknowledge()
      const phase = page.getByText('Opponent placing worker', { exact: true })
      await expect(phase).toBeVisible()
      await expectNoOverlap(phase)
      await expect(sync).toHaveCount(0)
      await expect(navigation.getByRole('link')).toHaveCount(1)

      await socket.close({ code: 1012, reason: 'Service restart' })
      await expect(page.getByText(/^Reconnecting/)).toBeVisible()
      const acknowledgeReplacement = await secondSubscription.promise
      await expect(sync).toBeVisible()
      await expectNoOverlap(sync)
      acknowledgeReplacement()
      const newPhase = page.getByText('Opponent moving', { exact: true })
      await expect(newPhase).toBeVisible()
      await expectNoOverlap(newPhase)
    })
  })
}

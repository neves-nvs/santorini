import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gameApi } from '@/game/services/gameApi'
import type { CreateGameResponse, GameSummary, GameView, WebSocketTicketResponse } from '@santorini/shared'

const aGame = (id: number, status: GameSummary['status']): GameSummary => ({
  id,
  creatorId: 1,
  maxPlayers: 2,
  status,
  phase: null,
  currentSeat: null,
  turnNumber: 0,
  version: 1,
  playerCount: 1,
  players: [{ userId: 1, status: 'active', isReady: false }],
  createdAt: '2026-01-01T00:00:00.000Z',
  startedAt: null,
  finishedAt: null,
})

describe('gameApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('websocket ticket', () => {
    it('should create a WebSocket ticket', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ticket: 'ticket-123' }) satisfies WebSocketTicketResponse,
      })

      const ticket = await gameApi.createWebSocketTicket()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/ws-ticket'),
        expect.objectContaining({ method: 'POST' })
      )
      expect(ticket).toBe('ticket-123')
    })
  })

  describe('game management methods', () => {
    it('should get games list', async () => {
      const mockGames = [aGame(1, 'waiting'), aGame(2, 'in-progress')]
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockGames,
      })

      const result = await gameApi.getGames()

      expect(result).toEqual(mockGames)
    })

    it('should create game', async () => {
      const mockResponse: CreateGameResponse = { gameId: 123 }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const result = await gameApi.createGame({ maxPlayers: 2 })

      expect(result).toEqual(mockResponse)
    })

    it('should get game state', async () => {
      const mockGameState: GameView = {
        gameId: 1,
        status: 'in-progress',
        phase: 'moving',
        maxPlayers: 2,
        currentSeat: 0,
        turnNumber: 3,
        version: 7,
        board: { cells: [] },
        players: [],
        winnerUserId: null,
        winReason: null,
        viewer: { role: 'player', isCurrentPlayer: true, availableMoves: [] },
      }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockGameState,
      })

      const result = await gameApi.getGame('1')

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/games/1',
        expect.any(Object)
      )
      expect(result).toEqual(mockGameState)
    })
  })
})

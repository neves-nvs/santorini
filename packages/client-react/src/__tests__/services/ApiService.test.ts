import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiService } from '../../services/ApiService'
import { ErrorType, GameError } from '../../utils/errorHandler'

describe('ApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('request method', () => {
    it('should make successful GET request', async () => {
      const mockData = { id: 1, name: 'Test Game' }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      })

      const result = await apiService.getGames()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/games',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      )
    })

    it('should make successful POST request', async () => {
      const mockResponse = { gameId: 123 }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const result = await apiService.createGame({ player_count: 2 })

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/games',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ player_count: 2 }),
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('should handle non-JSON responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'OK',
      })

      const result = await apiService.login({
        username: 'test',
        password: 'pass',
      })

      expect(result).toBe('OK')
    })

    it('should throw GameError on 401 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Unauthorized' }),
      })

      await expect(apiService.getGames()).rejects.toThrow(GameError)
      await expect(apiService.getGames()).rejects.toMatchObject({
        type: ErrorType.AUTHENTICATION,
        code: 401,
      })
    })

    it('should throw GameError on 400 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Bad request' }),
      })

      await expect(apiService.getGames()).rejects.toThrow(GameError)
      await expect(apiService.getGames()).rejects.toMatchObject({
        type: ErrorType.VALIDATION,
        code: 400,
      })
    })

    it('should throw GameError on 500 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Server error' }),
      })

      await expect(apiService.getGames()).rejects.toThrow(GameError)
      await expect(apiService.getGames()).rejects.toMatchObject({
        type: ErrorType.NETWORK,
        code: 500,
      })
    })

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

      await expect(apiService.getGames()).rejects.toThrow(GameError)
      await expect(apiService.getGames()).rejects.toMatchObject({
        type: ErrorType.NETWORK,
      })
    })
  })

  describe('authentication methods', () => {
    it('should login with credentials', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'OK',
      })

      const result = await apiService.login({
        username: 'testuser',
        password: 'testpass',
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/session',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'testuser', password: 'testpass' }),
        })
      )
      expect(result).toBe('OK')
    })

    it('should logout', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        text: async () => '',
      })

      await apiService.logout()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/logout',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should not throw on logout failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Logout failed'))

      await expect(apiService.logout()).resolves.toBeUndefined()
    })

    it('should get JWT token', async () => {
      const mockToken = { token: 'jwt-token-123' }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockToken,
      })

      const result = await apiService.getToken()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/token',
        expect.any(Object)
      )
      expect(result).toEqual(mockToken)
    })

    it('should check authentication status', async () => {
      const mockUser = { username: 'testuser' }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockUser,
      })

      const result = await apiService.checkAuth()

      expect(result).toEqual(mockUser)
    })

    it('should return null on checkAuth failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Unauthorized' }),
      })

      const result = await apiService.checkAuth()

      expect(result).toBeNull()
    })
  })

  describe('user management methods', () => {
    it('should create user', async () => {
      const mockUser = { id: 1, username: 'newuser' }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockUser,
      })

      const result = await apiService.createUser({
        username: 'newuser',
        password: 'password123',
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'newuser', password: 'password123' }),
        })
      )
      expect(result).toEqual(mockUser)
    })

    it('should get users list', async () => {
      const mockUsers = [
        { id: 1, username: 'user1' },
        { id: 2, username: 'user2' },
      ]
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockUsers,
      })

      const result = await apiService.getUsers()

      expect(result).toEqual(mockUsers)
    })
  })

  describe('game management methods', () => {
    it('should get games list', async () => {
      const mockGames = [
        { id: 1, status: 'waiting' },
        { id: 2, status: 'in-progress' },
      ]
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockGames,
      })

      const result = await apiService.getGames()

      expect(result).toEqual(mockGames)
    })

    it('should create game', async () => {
      const mockResponse = { gameId: 123 }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const result = await apiService.createGame({ player_count: 2 })

      expect(result).toEqual(mockResponse)
    })

    it('should get game state', async () => {
      const mockGameState = {
        id: 1,
        status: 'in-progress',
        board: { spaces: [] },
      }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockGameState,
      })

      const result = await apiService.getGameState('1')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/games/1/state',
        expect.any(Object)
      )
      expect(result).toEqual(mockGameState)
    })

    it('should join game', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      })

      const result = await apiService.joinGame('1')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/games/1/join',
        expect.objectContaining({
          method: 'POST',
        })
      )
      expect(result).toBe(true)
    })

    it('should return false on join game failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Game full' }),
      })

      const result = await apiService.joinGame('1')

      expect(result).toBe(false)
    })

    it('should set player ready status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      })

      const result = await apiService.setPlayerReady('1', true)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/games/1/ready',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ isReady: true }),
        })
      )
      expect(result).toBe(true)
    })
  })

  describe('move and turn methods', () => {
    it('should make a move', async () => {
      const mockResponse = { success: true }
      const move = { type: 'place_worker', position: { x: 0, y: 0 } }
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const result = await apiService.makeMove('1', move)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/games/1/move',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ move }),
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('should get turn state', async () => {
      const mockTurnState = {
        currentPlayer: 1,
        phase: 'moving',
        availablePlays: [],
      }
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockTurnState,
      })

      const result = await apiService.getTurnState('1')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/games/1/turn',
        expect.any(Object)
      )
      expect(result).toEqual(mockTurnState)
    })
  })
})


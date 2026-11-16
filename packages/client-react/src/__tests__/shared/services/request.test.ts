import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '@/shared/services/request'
import { ErrorType, GameError } from '@/shared/utils/errorHandler'
import type { CreateGameResponse } from '@santorini/shared'

describe('request', () => {
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

      await request('/games')

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/games',
        expect.objectContaining({
          credentials: 'include',
        })
      )
    })

    it('should make successful POST request', async () => {
      const mockResponse: CreateGameResponse = { gameId: 123 }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      })

      const result = await request<CreateGameResponse>('/games', {
        method: 'POST',
        body: JSON.stringify({ maxPlayers: 2 }),
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/games',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ maxPlayers: 2 }),
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

      const result = await request<string>('/session', { method: 'POST' })

      expect(result).toBe('OK')
    })

    it('should throw GameError on 401 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Unauthorized' }),
      })

      await expect(request('/games')).rejects.toThrow(GameError)
      await expect(request('/games')).rejects.toMatchObject({
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

      await expect(request('/games')).rejects.toThrow(GameError)
      await expect(request('/games')).rejects.toMatchObject({
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

      await expect(request('/games')).rejects.toThrow(GameError)
      await expect(request('/games')).rejects.toMatchObject({
        type: ErrorType.NETWORK,
        code: 500,
      })
    })

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

      await expect(request('/games')).rejects.toThrow(GameError)
      await expect(request('/games')).rejects.toMatchObject({
        type: ErrorType.NETWORK,
      })
    })
  })
})

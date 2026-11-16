import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { userApi } from '@/user/services/userApi'
import type { CurrentUserResponse, UserView } from '@santorini/shared'

const aUser = (id: number): UserView => ({
  id,
  username: `user${id}`,
  displayName: `user${id}`,
  createdAt: '2026-01-01T00:00:00.000Z',
})

describe('userApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('authentication methods', () => {
    it('should login with credentials', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'OK',
      })

      const result = await userApi.login({
        username: 'testuser',
        password: 'testpass',
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/session',
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

      await userApi.logout()

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/logout',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should not throw on logout failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Logout failed'))

      await expect(userApi.logout()).resolves.toBeUndefined()
    })

    it('should check authentication status', async () => {
      const mockUser: CurrentUserResponse = { id: 1, username: 'testuser' }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockUser,
      })

      const result = await userApi.checkAuth()

      expect(result).toEqual(mockUser)
    })

    it('should return null on checkAuth failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Unauthorized' }),
      })

      const result = await userApi.checkAuth()

      expect(result).toBeNull()
    })
  })

  describe('user management methods', () => {
    it('should create user', async () => {
      const mockUser = { ...aUser(1), username: 'newuser' }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockUser,
      })

      const result = await userApi.createUser({
        username: 'newuser',
        password: 'password123',
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'newuser', password: 'password123' }),
        })
      )
      expect(result).toEqual(mockUser)
    })
  })
})

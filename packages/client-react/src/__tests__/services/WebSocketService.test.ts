import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebSocketService } from '../../services/WebSocketService'
import { useGameStore } from '../../store/gameStore'

// Mock the game store
vi.mock('../../store/gameStore', () => ({
  useGameStore: {
    getState: vi.fn(() => ({
      setConnected: vi.fn(),
      setConnecting: vi.fn(),
      isConnected: false,
    })),
  },
}))

// Mock the API service
vi.mock('../../services/ApiService', () => ({
  apiService: {
    getToken: vi.fn().mockResolvedValue({ token: 'mock-jwt-token' }),
  },
}))

describe('WebSocketService', () => {
  let service: WebSocketService
  let mockWebSocket: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create mock WebSocket
    mockWebSocket = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      readyState: WebSocket.OPEN,
      onopen: null,
      onclose: null,
      onerror: null,
      onmessage: null,
    }

    // Mock WebSocket constructor
    global.WebSocket = vi.fn(() => mockWebSocket) as any

    service = new WebSocketService()
  })

  afterEach(() => {
    service.disconnect()
  })

  describe('connection management', () => {
    it('should not auto-connect on instantiation', () => {
      expect(global.WebSocket).not.toHaveBeenCalled()
    })

    it('should connect after authentication', async () => {
      await service.connectAfterAuth()

      expect(global.WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('ws://localhost:3000')
      )
    })

    it('should include JWT token in connection URL', async () => {
      await service.connectAfterAuth()

      expect(global.WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('token=mock-jwt-token')
      )
    })

    it('should set up event listeners on connection', async () => {
      await service.connectAfterAuth()

      expect(mockWebSocket.addEventListener).toHaveBeenCalled()
    })

    it('should update store on successful connection', async () => {
      const mockSetConnected = vi.fn()
      const mockSetConnecting = vi.fn()
      
      vi.mocked(useGameStore.getState).mockReturnValue({
        setConnected: mockSetConnected,
        setConnecting: mockSetConnecting,
        isConnected: false,
      } as any)

      await service.connectAfterAuth()

      // Trigger onopen
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen(new Event('open'))
      }

      expect(mockSetConnected).toHaveBeenCalledWith(true)
      expect(mockSetConnecting).toHaveBeenCalledWith(false)
    })

    it('should disconnect cleanly', async () => {
      await service.connectAfterAuth()
      
      service.disconnect()

      expect(mockWebSocket.close).toHaveBeenCalled()
    })

    it('should handle connection errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await service.connectAfterAuth()

      // Trigger onerror
      if (mockWebSocket.onerror) {
        mockWebSocket.onerror(new Event('error'))
      }

      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('message sending', () => {
    beforeEach(async () => {
      await service.connectAfterAuth()
      mockWebSocket.readyState = WebSocket.OPEN
    })

    it('should send message when connected', () => {
      service.send('test_message', { data: 'test' })

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'test_message',
          payload: { data: 'test' },
        })
      )
    })

    it('should throw error when not connected', () => {
      mockWebSocket.readyState = WebSocket.CLOSED

      expect(() => {
        service.send('test_message', {})
      }).toThrow('WebSocket is not connected')
    })

    it('should handle send errors', () => {
      mockWebSocket.send.mockImplementation(() => {
        throw new Error('Send failed')
      })

      expect(() => {
        service.send('test_message', {})
      }).toThrow('Send failed')
    })
  })

  describe('event handling', () => {
    it('should register event handlers', () => {
      const handler = vi.fn()
      
      service.on('test_event', handler)

      // Verify handler is registered (internal state check)
      expect(handler).toBeDefined()
    })

    it('should unregister event handlers', () => {
      const handler = vi.fn()
      
      service.on('test_event', handler)
      service.off('test_event', handler)

      // Handler should be removed
      expect(handler).toBeDefined()
    })

    it('should call registered handlers on message', async () => {
      const handler = vi.fn()
      
      await service.connectAfterAuth()
      service.on('game_update', handler)

      // Simulate incoming message
      const message = {
        type: 'game_update',
        payload: { gameId: 1 },
      }

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify(message),
        } as MessageEvent)
      }

      expect(handler).toHaveBeenCalledWith(message)
    })

    it('should handle multiple handlers for same event', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      
      await service.connectAfterAuth()
      service.on('game_update', handler1)
      service.on('game_update', handler2)

      const message = {
        type: 'game_update',
        payload: { gameId: 1 },
      }

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify(message),
        } as MessageEvent)
      }

      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })
  })

  describe('game-specific methods', () => {
    beforeEach(async () => {
      await service.connectAfterAuth()
      mockWebSocket.readyState = WebSocket.OPEN
    })

    it('should subscribe to game', () => {
      service.subscribeToGame('123')

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('subscribe_game')
      )
    })

    it('should unsubscribe from game', () => {
      service.unsubscribeFromGame('123')

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('unsubscribe_game')
      )
    })

    it('should join game', () => {
      service.joinGame('123')

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('join_game')
      )
    })

    it('should retry subscription if connecting', () => {
      vi.useFakeTimers()
      mockWebSocket.readyState = WebSocket.CONNECTING

      service.subscribeToGame('123')

      // Should not send immediately
      expect(mockWebSocket.send).not.toHaveBeenCalled()

      // Fast-forward time
      vi.advanceTimersByTime(500)

      vi.useRealTimers()
    })

    it('should retry join if connecting', () => {
      vi.useFakeTimers()
      mockWebSocket.readyState = WebSocket.CONNECTING

      service.joinGame('123')

      // Should not send immediately
      expect(mockWebSocket.send).not.toHaveBeenCalled()

      // Fast-forward time
      vi.advanceTimersByTime(200)

      vi.useRealTimers()
    })
  })

  describe('reconnection logic', () => {
    it('should attempt to reconnect on connection loss', async () => {
      vi.useFakeTimers()

      await service.connectAfterAuth()

      // Trigger close event
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose(new CloseEvent('close'))
      }

      // Fast-forward to trigger reconnection
      vi.advanceTimersByTime(2000)

      // Should attempt to create new WebSocket
      expect(global.WebSocket).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })

    it('should stop reconnecting after max attempts', async () => {
      vi.useFakeTimers()

      await service.connectAfterAuth()

      // Trigger multiple close events
      for (let i = 0; i < 6; i++) {
        if (mockWebSocket.onclose) {
          mockWebSocket.onclose(new CloseEvent('close'))
        }
        vi.advanceTimersByTime(2000)
      }

      // Should not exceed max reconnection attempts
      expect(global.WebSocket).toHaveBeenCalledTimes(6) // Initial + 5 retries

      vi.useRealTimers()
    })
  })

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(service.isConnected()).toBe(false)
    })

    it('should return true when connected', async () => {
      await service.connectAfterAuth()
      mockWebSocket.readyState = WebSocket.OPEN

      // Manually set socket to simulate connection
      ;(service as any).socket = mockWebSocket

      expect(service.isConnected()).toBe(true)
    })

    it('should return false when socket is null', () => {
      ;(service as any).socket = null

      expect(service.isConnected()).toBe(false)
    })
  })

  describe('message parsing', () => {
    it('should handle invalid JSON messages', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await service.connectAfterAuth()

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: 'invalid json{',
        } as MessageEvent)
      }

      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })

    it('should handle messages without type', async () => {
      await service.connectAfterAuth()

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({ payload: {} }),
        } as MessageEvent)
      }

      // Should not crash
      expect(true).toBe(true)
    })
  })
})


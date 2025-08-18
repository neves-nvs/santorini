import { WebSocketMessage } from '../types/game'
import { gameplayService } from './GameplayService'
import { ErrorHandler, ErrorType } from '../utils/errorHandler'
import { RECONNECTION_DELAY } from '../constants/gameConstants'

export type WebSocketEventHandler = (message: WebSocketMessage) => void

export class WebSocketService {
  private socket: WebSocket | null = null
  private serverAddress = 'ws://localhost:3000'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = RECONNECTION_DELAY
  private eventHandlers: Map<string, WebSocketEventHandler[]> = new Map()
  private isAuthenticated = false

  constructor() {
    // Don't auto-connect, wait for authentication
  }

  // Call this after successful login
  public async connectAfterAuth() {
    this.isAuthenticated = true

    // Get JWT token from the server
    try {
      const { apiService } = await import('./ApiService')
      const tokenResponse = await apiService.getToken()
      this.authToken = tokenResponse.token
      console.log('🔑 Got JWT token for WebSocket')
    } catch (error) {
      const authError = ErrorHandler.createError(
        ErrorType.AUTHENTICATION,
        error as Error,
        undefined,
        { context: 'JWT token retrieval' }
      )

      ErrorHandler.logError(authError, 'WebSocketService.connectAfterAuth')
      this.isAuthenticated = false
      return
    }

    this.connect()
  }

  private authToken: string | null = null

  // Call this on logout
  public disconnect() {
    console.log('🔌 Disconnecting WebSocket service')
    this.isAuthenticated = false
    this.authToken = null
    this.reconnectAttempts = 0

    if (this.socket) {
      this.socket.close()
      this.socket = null
    }

    // Clear all event handlers
    this.eventHandlers.clear()

    // Emit disconnected event to update UI state
    this.emit('disconnected', { connected: false })
  }

  private connect() {
    // Prevent multiple simultaneous connections
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      console.log('WebSocket already connecting or connected, skipping new connection')
      return
    }

    try {
      // Add token as query parameter if available
      let wsUrl = this.serverAddress
      if (this.authToken) {
        wsUrl += `?token=${this.authToken}`
      }

      console.log('🔌 Creating WebSocket connection')
      this.socket = new WebSocket(wsUrl)

      this.socket.onopen = () => {
        console.log('✅ WebSocket connected')
        this.reconnectAttempts = 0
        this.emit('connected', { connected: true })
      }

      this.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          const parseError = ErrorHandler.createError(
            ErrorType.WEBSOCKET,
            `Failed to parse WebSocket message: ${error}`,
            undefined,
            { rawMessage: event.data }
          )
          ErrorHandler.logError(parseError, 'WebSocketService.onmessage')
        }
      }

      this.socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason)
        this.emit('disconnected', { connected: false })
        this.attemptReconnect()
      }

      this.socket.onerror = (error) => {
        const wsError = ErrorHandler.handleWebSocketError(error)
        ErrorHandler.logError(wsError, 'WebSocketService.connect')

        this.emit('error', {
          error: ErrorHandler.getUserMessage(wsError)
        })

        // Don't immediately try to reconnect on error - let onclose handle it
        // This prevents rapid reconnection attempts that can cause more errors
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      this.attemptReconnect()
    }
  }

  private attemptReconnect() {
    if (this.isAuthenticated && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

      setTimeout(() => {
        this.connect()
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      console.error('Max reconnection attempts reached or not authenticated')
      this.emit('maxReconnectAttemptsReached', { error: 'Failed to reconnect to server' })
    }
  }

  private handleMessage(message: WebSocketMessage) {
    const { type, payload } = message

    // Log important game flow messages
    if (type === 'game_start' || type === 'game_ready_for_start' || type === 'error') {
      console.log('🔌 WebSocket message:', type, payload)
    }

    // Handle error messages
    if (type === 'error') {
      console.error('🚨 Server error received:', payload)
      // Don't disconnect on server errors - just log them
      // The error might be a game logic error (like "not your turn")
      this.emit('server_error', payload)
    }

    // Route gameplay messages to GameplayService
    if (type === 'your_turn' || type === 'game_update' || type === 'available_plays' || type === 'available_moves' || type === 'game_state_update' || type === 'move_acknowledged' || type === 'error') {
      console.log(`🔌 Routing ${type} message to GameplayService:`, message)
      gameplayService.handleMessage(message)
    }

    // Emit the specific message type
    this.emit(type, payload)

    // Also emit a general 'message' event
    this.emit('message', message)
  }

  // Event system
  on(event: string, handler: WebSocketEventHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }

  off(event: string, handler: WebSocketEventHandler) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler({ type: event, payload: data })
        } catch (error) {
          const handlerError = ErrorHandler.createError(
            ErrorType.UNKNOWN,
            `Event handler error for ${event}: ${error}`,
            undefined,
            { event, data }
          )
          ErrorHandler.logError(handlerError, 'WebSocketService.emit')
        }
      })
    }
  }

  // Send message to server
  send(type: string, payload: any) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      const error = new Error(`WebSocket is not connected. State: ${this.socket?.readyState || 'null'}`)
      console.error('WebSocket send failed:', error.message, { type, payload })
      throw error
    }

    try {
      const message = { type, payload }
      this.socket.send(JSON.stringify(message))
      console.log('📤 Sent:', type)
    } catch (error) {
      console.error('Failed to send WebSocket message:', error, { type, payload })
      throw error
    }
  }

  // Game-specific methods (backend extracts username from JWT token)
  subscribeToGame(gameId: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('📡 Subscribing to game:', gameId)
      this.send('subscribe_game', { gameId })
    } else {
      console.warn('⚠️ WebSocket not ready for subscription. State:', this.socket?.readyState)
      // Simple retry after a short delay if connection is still connecting
      if (this.socket?.readyState === WebSocket.CONNECTING) {
        setTimeout(() => {
          this.subscribeToGame(gameId)
        }, 200)
      }
    }
  }

  unsubscribeFromGame(gameId: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('📡 Unsubscribing from game:', gameId)
      this.send('unsubscribe_game', { gameId })
    } else {
      console.warn('⚠️ WebSocket not ready for unsubscription. State:', this.socket?.readyState)
    }
  }

  joinGame(gameId: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('🎮 Joining game:', gameId)
      this.send('join_game', { gameId: parseInt(gameId) })
    } else {
      console.warn('⚠️ WebSocket not ready for joining. State:', this.socket?.readyState)
      // Simple retry after a short delay if connection is still connecting
      if (this.socket?.readyState === WebSocket.CONNECTING) {
        setTimeout(() => {
          this.joinGame(gameId)
        }, 200)
      }
    }
  }

  placeWorker(x: number, y: number) {
    this.send('place_worker', { x, y })
  }

  moveWorker(from: { x: number, y: number }, to: { x: number, y: number }) {
    this.send('move_worker', { from, to })
  }

  buildBlock(x: number, y: number, blockType: string = 'BASE') {
    this.send('build_block', { x, y, blockType })
  }

  // Connection status
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }
}

// Singleton instance - don't auto-instantiate
let webSocketServiceInstance: WebSocketService | null = null

export const webSocketService = {
  getInstance(): WebSocketService {
    if (!webSocketServiceInstance) {
      webSocketServiceInstance = new WebSocketService()
    }
    return webSocketServiceInstance
  },

  // Proxy methods for convenience
  connectAfterAuth() {
    this.getInstance().connectAfterAuth()
  },

  disconnect() {
    if (webSocketServiceInstance) {
      webSocketServiceInstance.disconnect()
      // Don't set to null immediately - let the instance handle cleanup
      // webSocketServiceInstance = null
    }
  },

  isConnected(): boolean {
    return webSocketServiceInstance?.isConnected() ?? false
  },

  on(event: string, handler: WebSocketEventHandler) {
    this.getInstance().on(event, handler)
  },

  off(event: string, handler: WebSocketEventHandler) {
    this.getInstance().off(event, handler)
  },

  send(type: string, payload: any) {
    this.getInstance().send(type, payload)
  },

  subscribeToGame(gameId: string) {
    this.getInstance().subscribeToGame(gameId)
  },

  unsubscribeFromGame(gameId: string) {
    this.getInstance().unsubscribeFromGame(gameId)
  },

  joinGame(gameId: string) {
    this.getInstance().joinGame(gameId)
  },

  placeWorker(x: number, y: number) {
    this.getInstance().placeWorker(x, y)
  },

  moveWorker(from: { x: number, y: number }, to: { x: number, y: number }) {
    this.getInstance().moveWorker(from, to)
  },

  buildBlock(x: number, y: number, blockType?: string) {
    this.getInstance().buildBlock(x, y, blockType)
  }
}

import { WebSocketMessage, GameState, AvailablePlay } from '../types/game'
import { gameplayService } from './GameplayService'

export type WebSocketEventHandler = (message: WebSocketMessage) => void

export class WebSocketService {
  private socket: WebSocket | null = null
  private serverAddress = 'ws://localhost:3000'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
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
      console.log('Got JWT token for WebSocket:', this.authToken)
    } catch (error) {
      console.error('Failed to get JWT token:', error)
      // If we can't get a token, don't try to connect - user needs to re-authenticate
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

      console.log('Creating new WebSocket connection to:', wsUrl)
      this.socket = new WebSocket(wsUrl)
      
      this.socket.onopen = () => {
        console.log('Connected to WebSocket server')
        this.reconnectAttempts = 0
        this.emit('connected', { connected: true })
      }

      this.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log('WebSocket message received:', message)
          this.handleMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      this.socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason)
        this.emit('disconnected', { connected: false })
        this.attemptReconnect()
      }

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.emit('error', { error: 'WebSocket connection error' })
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

    // Log all messages for debugging
    console.log('🔌 WebSocket message received:', { type, payload })
    console.log('🔌 Full message object:', JSON.stringify(message, null, 2))

    // Special logging for turn-related messages
    if (type === 'available_plays') {
      console.log('🎯 AVAILABLE_PLAYS message detected!')
      console.log('🎯 Payload:', payload)
      console.log('🎯 Payload type:', typeof payload)
      console.log('🎯 Is array:', Array.isArray(payload))
    }

    if (type === 'game_state_update') {
      console.log('📢 GAME_STATE_UPDATE message detected!')
      console.log('📢 Payload:', payload)
    }

    // Route gameplay messages to GameplayService
    if (type === 'your_turn' || type === 'game_update' || type === 'available_plays' || type === 'game_state_update' || type === 'move_acknowledged') {
      console.log('🎮 Routing to GameplayService:', type)
      gameplayService.handleMessage(message)
    } else {
      console.log('🔌 Not routing to GameplayService, message type:', type)
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
          console.error(`Error in event handler for ${event}:`, error)
        }
      })
    }
  }

  // Send message to server
  send(type: string, payload: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = { type, payload }
      this.socket.send(JSON.stringify(message))
      console.log('Sent WebSocket message:', message)
    } else {
      console.warn('WebSocket is not connected. Cannot send message:', { type, payload })
    }
  }

  // Game-specific methods
  subscribeToGame(gameId: string, username: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('📡 Sending subscribe_game message:', { gameId, username })
      this.send('subscribe_game', { gameId, username })
    } else {
      console.warn('⚠️ WebSocket not ready for subscription. State:', this.socket?.readyState)
      // Simple retry after a short delay if connection is still connecting
      if (this.socket?.readyState === WebSocket.CONNECTING) {
        setTimeout(() => {
          this.subscribeToGame(gameId, username)
        }, 200)
      }
    }
  }

  joinGame(gameId: string, username: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('🎮 Sending join_game message:', { gameId, username })
      this.send('join_game', { gameId: parseInt(gameId), username })
    } else {
      console.warn('⚠️ WebSocket not ready for joining. State:', this.socket?.readyState)
      // Simple retry after a short delay if connection is still connecting
      if (this.socket?.readyState === WebSocket.CONNECTING) {
        setTimeout(() => {
          this.joinGame(gameId, username)
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

  subscribeToGame(gameId: string, username: string) {
    this.getInstance().subscribeToGame(gameId, username)
  },

  joinGame(gameId: string, username: string) {
    this.getInstance().joinGame(gameId, username)
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

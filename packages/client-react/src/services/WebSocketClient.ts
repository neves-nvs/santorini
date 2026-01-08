/**
 * WebSocketClient - Pure WebSocket connection management
 * 
 * This service ONLY handles:
 * - Connection lifecycle (connect, disconnect, reconnect)
 * - Sending messages
 * - Emitting raw messages to handlers
 * 
 * It does NOT:
 * - Import or mutate the store
 * - Transform message data
 * - Handle game-specific logic
 */

import { WS_MESSAGE_TYPES } from '../../../shared/src/websocket-types'
import { handleWebSocketMessage, handleConnectionChange, resetMessageHandlerState } from './GameMessageHandler'
import { RECONNECTION_DELAY } from '../constants/gameConstants'

interface WebSocketMessage {
  type: string
  payload: unknown
}

export type MessageHandler = (type: string, payload: unknown) => void

class WebSocketClient {
  private socket: WebSocket | null = null
  private serverAddress = 'ws://localhost:3000'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = RECONNECTION_DELAY
  private authToken: string | null = null
  private isAuthenticated = false

  /**
   * Connect after authentication - fetches JWT token first
   */
  async connectAfterAuth(): Promise<void> {
    console.log('🔌 WebSocketClient.connectAfterAuth called')
    this.isAuthenticated = true

    try {
      // Dynamic import to avoid circular dependency
      const { apiService } = await import('./ApiService')
      const tokenResponse = await apiService.getToken()
      this.authToken = tokenResponse.token
      console.log('🔑 Got JWT token for WebSocket')
    } catch (error) {
      console.error('🚨 Failed to get JWT token:', error)
      this.isAuthenticated = false
      return
    }

    this.connect()
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    console.log('🔌 WebSocketClient disconnecting')
    this.isAuthenticated = false
    this.authToken = null
    this.reconnectAttempts = 0

    if (this.socket) {
      this.socket.close()
      this.socket = null
    }

    handleConnectionChange(false)
    resetMessageHandlerState()
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  /**
   * Send a message to the server
   */
  send(type: string, payload: unknown): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected, cannot send:', type)
      throw new Error(`WebSocket not connected. State: ${this.socket?.readyState ?? 'null'}`)
    }

    this.socket.send(JSON.stringify({ type, payload }))
    console.log('📤 Sent:', type)
  }

  // ─────────────────────────────────────────────────────────────
  // Game-specific convenience methods (just wrap send)
  // ─────────────────────────────────────────────────────────────

  subscribeToGame(gameId: string): void {
    if (!this.isConnected()) {
      console.warn('⚠️ WebSocket not ready for subscription, retrying...')
      this.retryWhenReady(() => this.subscribeToGame(gameId))
      return
    }
    console.log('📡 Subscribing to game:', gameId)
    this.send(WS_MESSAGE_TYPES.SUBSCRIBE_GAME, { gameId })
  }

  unsubscribeFromGame(gameId: string): void {
    console.log('📡 Unsubscribe requested (cleanup on disconnect):', gameId)
  }

  joinGame(gameId: string): void {
    if (!this.isConnected()) {
      console.warn('⚠️ WebSocket not ready for join, retrying...')
      this.retryWhenReady(() => this.joinGame(gameId))
      return
    }
    console.log('🎮 Joining game:', gameId)
    this.send(WS_MESSAGE_TYPES.JOIN_GAME, { gameId: parseInt(gameId) })
  }

  makeMove(moveType: string, data: unknown): void {
    this.send(moveType, data)
  }

  setReady(gameId: string, isReady: boolean): void {
    if (!this.isConnected()) {
      console.warn('⚠️ WebSocket not ready for setReady, retrying...')
      this.retryWhenReady(() => this.setReady(gameId, isReady))
      return
    }
    console.log('🎯 Setting ready status:', { gameId, isReady })
    this.send(WS_MESSAGE_TYPES.SET_READY, { gameId: parseInt(gameId), isReady })
  }

  // ─────────────────────────────────────────────────────────────
  // Private methods
  // ─────────────────────────────────────────────────────────────

  private connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      console.log('WebSocket already connecting/connected')
      return
    }

    const wsUrl = this.authToken 
      ? `${this.serverAddress}?token=${this.authToken}`
      : this.serverAddress

    console.log('🔌 Creating WebSocket connection')
    this.socket = new WebSocket(wsUrl)

    this.socket.onopen = () => {
      console.log('✅ WebSocket connected')
      this.reconnectAttempts = 0
      handleConnectionChange(true)
    }

    this.socket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        handleWebSocketMessage(message.type, message.payload)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.socket.onclose = (event) => {
      console.log('🔌 WebSocket closed:', event.code, event.reason)
      handleConnectionChange(false)
      this.attemptReconnect()
    }

    this.socket.onerror = (error) => {
      console.error('🚨 WebSocket error:', error)
    }
  }

  private attemptReconnect(): void {
    if (!this.isAuthenticated || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached or not authenticated')
      return
    }

    this.reconnectAttempts++
    console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      this.connect()
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  private retryWhenReady(action: () => void, attempts = 0): void {
    if (attempts >= 5) {
      console.error('Max retry attempts reached')
      return
    }

    if (this.socket?.readyState === WebSocket.CONNECTING) {
      setTimeout(() => action(), 500)
    } else if (!this.socket) {
      this.connectAfterAuth().then(() => {
        setTimeout(() => action(), 1000)
      })
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton export
// ─────────────────────────────────────────────────────────────

let instance: WebSocketClient | null = null

export const webSocketClient = {
  getInstance(): WebSocketClient {
    if (!instance) {
      instance = new WebSocketClient()
    }
    return instance
  },

  connectAfterAuth(): Promise<void> {
    return this.getInstance().connectAfterAuth()
  },

  disconnect(): void {
    instance?.disconnect()
  },

  isConnected(): boolean {
    return instance?.isConnected() ?? false
  },

  send(type: string, payload: unknown): void {
    this.getInstance().send(type, payload)
  },

  subscribeToGame(gameId: string): void {
    this.getInstance().subscribeToGame(gameId)
  },

  unsubscribeFromGame(gameId: string): void {
    this.getInstance().unsubscribeFromGame(gameId)
  },

  joinGame(gameId: string): void {
    this.getInstance().joinGame(gameId)
  },

  makeMove(moveType: string, data: unknown): void {
    this.getInstance().makeMove(moveType, data)
  },

  setReady(gameId: string, isReady: boolean): void {
    this.getInstance().setReady(gameId, isReady)
  }
}


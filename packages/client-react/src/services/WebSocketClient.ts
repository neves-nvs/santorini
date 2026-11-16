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

import { type ClientMessage, type MoveCommand, WS_MESSAGE_TYPES } from '@santorini/shared'
import { apiService } from './ApiService'
import { handleWebSocketMessage, handleConnectionChange, resetMessageHandlerState } from './GameMessageHandler'
import { parseServerMessage } from './parseServerMessage'
import { RECONNECTION_DELAY } from '@/constants/gameConstants'

function getWebSocketUrl(): string {
  const envUrl = import.meta.env.VITE_WS_URL
  if (envUrl && !envUrl.startsWith('/')) {
    return envUrl
  }
  // Construct WebSocket URL from current host (for proxy setup)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const path = envUrl || '/ws'
  return `${protocol}//${window.location.host}${path}`
}

class WebSocketClient {
  private socket: WebSocket | null = null
  private serverAddress = getWebSocketUrl()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = RECONNECTION_DELAY
  private shouldReconnect = false

  /**
   * Open the socket and keep it open across drops. A browser cannot set headers on the handshake, so each
   * connection asks the server for a one-time ticket first.
   */
  async connect(): Promise<void> {
    console.log('WebSocketClient.connect called')
    this.shouldReconnect = true
    await this.openSocket()
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    console.log('WebSocketClient disconnecting')
    this.shouldReconnect = false
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
  send(message: ClientMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected, cannot send:', message.type)
      throw new Error(`WebSocket not connected. State: ${this.socket?.readyState ?? 'null'}`)
    }

    this.socket.send(JSON.stringify(message))
    console.log('Sent:', message.type)
  }

  // ─────────────────────────────────────────────────────────────
  // Game-specific convenience methods (just wrap send)
  // ─────────────────────────────────────────────────────────────

  subscribeToGame(gameId: string): void {
    if (!this.isConnected()) {
      console.warn('WebSocket not ready for subscription, retrying...')
      this.retryWhenReady(() => this.subscribeToGame(gameId))
      return
    }
    console.log('Subscribing to game:', gameId)
    this.send({ type: WS_MESSAGE_TYPES.SUBSCRIBE_GAME, payload: { gameId: parseInt(gameId) } })
  }

  unsubscribeFromGame(gameId: string): void {
    console.log('Unsubscribe requested (cleanup on disconnect):', gameId)
  }

  joinGame(gameId: string): void {
    if (!this.isConnected()) {
      console.warn('WebSocket not ready for join, retrying...')
      this.retryWhenReady(() => this.joinGame(gameId))
      return
    }
    console.log('Joining game:', gameId)
    this.send({ type: WS_MESSAGE_TYPES.JOIN_GAME, payload: { gameId: parseInt(gameId) } })
  }

  makeMove(gameId: number, move: MoveCommand): void {
    this.send({ type: WS_MESSAGE_TYPES.MAKE_MOVE, payload: { gameId, move } })
  }

  setReady(gameId: string, isReady: boolean): void {
    if (!this.isConnected()) {
      console.warn('WebSocket not ready for setReady, retrying...')
      this.retryWhenReady(() => this.setReady(gameId, isReady))
      return
    }
    console.log('Setting ready status:', { gameId, isReady })
    this.send({ type: WS_MESSAGE_TYPES.SET_READY, payload: { gameId: parseInt(gameId), isReady } })
  }

  // ─────────────────────────────────────────────────────────────
  // Private methods
  // ─────────────────────────────────────────────────────────────

  private isOpenOrOpening(): boolean {
    return this.socket?.readyState === WebSocket.CONNECTING || this.socket?.readyState === WebSocket.OPEN
  }

  private async openSocket(): Promise<void> {
    if (this.isOpenOrOpening()) {
      console.log('WebSocket already connecting/connected')
      return
    }

    let ticket: string
    try {
      ticket = await apiService.createWebSocketTicket()
    } catch (error) {
      console.error('Failed to get a WebSocket ticket:', error)
      this.attemptReconnect()
      return
    }

    // disconnect() may have run, or another call may have opened the socket, while the ticket was on its way
    if (!this.shouldReconnect || this.isOpenOrOpening()) return

    console.log('Creating WebSocket connection')
    this.socket = new WebSocket(`${this.serverAddress}?ticket=${ticket}`)

    this.socket.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
      handleConnectionChange(true)
    }

    this.socket.onmessage = (event) => {
      const message = parseServerMessage(event.data)
      if (!message) {
        console.warn('Ignoring a WebSocket message the client does not recognise')
        return
      }

      try {
        handleWebSocketMessage(message)
      } catch (error) {
        console.error('Failed to handle WebSocket message:', message.type, error)
      }
    }

    this.socket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason)
      handleConnectionChange(false)
      this.attemptReconnect()
    }

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  private attemptReconnect(): void {
    if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Reconnecting is off or the maximum number of attempts was reached')
      return
    }

    this.reconnectAttempts++
    console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      void this.openSocket()
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
      void this.connect()
      setTimeout(() => action(), 1000)
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

  connect(): Promise<void> {
    return this.getInstance().connect()
  },

  disconnect(): void {
    instance?.disconnect()
  },

  isConnected(): boolean {
    return instance?.isConnected() ?? false
  },

  send(message: ClientMessage): void {
    this.getInstance().send(message)
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

  makeMove(gameId: number, move: MoveCommand): void {
    this.getInstance().makeMove(gameId, move)
  },

  setReady(gameId: string, isReady: boolean): void {
    this.getInstance().setReady(gameId, isReady)
  }
}


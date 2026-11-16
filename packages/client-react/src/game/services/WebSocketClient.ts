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

import { WS_MESSAGE_TYPES } from '@santorini/shared'
import { gameApi } from './gameApi'
import { RECONNECTION_DELAY } from '@/game/model/gameConstants'
import { logError, logWarn } from '@/shared/utils/log'

interface WebSocketMessage {
  type: string
  payload: unknown
}

type MessageHandler = (type: string, payload: unknown) => void

export interface SocketEvents {
  onMessage: MessageHandler
  onConnectionChange: (connected: boolean) => void
  onReset: () => void
}

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

// The update layer registers itself at startup (main.tsx), so services never import it.
let events: SocketEvents = { onMessage: () => {}, onConnectionChange: () => {}, onReset: () => {} }

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
    this.shouldReconnect = true
    await this.openSocket()
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.shouldReconnect = false
    this.reconnectAttempts = 0

    if (this.socket) {
      this.socket.close()
      this.socket = null
    }

    events.onConnectionChange(false)
    events.onReset()
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
      throw new Error(`WebSocket not connected. State: ${this.socket?.readyState ?? 'null'}`)
    }

    this.socket.send(JSON.stringify({ type, payload }))
  }

  // ─────────────────────────────────────────────────────────────
  // Game-specific convenience methods (just wrap send)
  // ─────────────────────────────────────────────────────────────

  subscribeToGame(gameId: string): void {
    if (!this.isConnected()) {
      logWarn('WebSocket not ready for subscription, retrying...')
      this.retryWhenReady(() => this.subscribeToGame(gameId))
      return
    }
    this.send(WS_MESSAGE_TYPES.SUBSCRIBE_GAME, { gameId: parseInt(gameId) })
  }

  joinGame(gameId: string): void {
    if (!this.isConnected()) {
      logWarn('WebSocket not ready for join, retrying...')
      this.retryWhenReady(() => this.joinGame(gameId))
      return
    }
    this.send(WS_MESSAGE_TYPES.JOIN_GAME, { gameId: parseInt(gameId) })
  }

  setReady(gameId: string, isReady: boolean): void {
    if (!this.isConnected()) {
      logWarn('WebSocket not ready for setReady, retrying...')
      this.retryWhenReady(() => this.setReady(gameId, isReady))
      return
    }
    this.send(WS_MESSAGE_TYPES.SET_READY, { gameId: parseInt(gameId), isReady })
  }

  // ─────────────────────────────────────────────────────────────
  // Private methods
  // ─────────────────────────────────────────────────────────────

  private isOpenOrOpening(): boolean {
    return this.socket?.readyState === WebSocket.CONNECTING || this.socket?.readyState === WebSocket.OPEN
  }

  private async openSocket(): Promise<void> {
    if (this.isOpenOrOpening()) {
      return
    }

    let ticket: string
    try {
      ticket = await gameApi.createWebSocketTicket()
    } catch (error) {
      logError('Failed to get a WebSocket ticket:', error)
      this.attemptReconnect()
      return
    }

    // disconnect() may have run, or another call may have opened the socket, while the ticket was on its way
    if (!this.shouldReconnect || this.isOpenOrOpening()) return

    this.socket = new WebSocket(`${this.serverAddress}?ticket=${ticket}`)

    this.socket.onopen = () => {
      this.reconnectAttempts = 0
      events.onConnectionChange(true)
    }

    this.socket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        events.onMessage(message.type, message.payload)
      } catch (error) {
        logError('Failed to parse WebSocket message:', error)
      }
    }

    this.socket.onclose = () => {
      events.onConnectionChange(false)
      this.attemptReconnect()
    }

    this.socket.onerror = () => {
      logError('WebSocket error')
    }
  }

  private attemptReconnect(): void {
    if (!this.shouldReconnect) return

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logError('Giving up reconnecting the WebSocket after the maximum number of attempts')
      return
    }

    this.reconnectAttempts++

    setTimeout(() => {
      void this.openSocket()
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  private retryWhenReady(action: () => void, attempts = 0): void {
    if (attempts >= 5) {
      logError('Max retry attempts reached')
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

  setEvents(next: SocketEvents): void {
    events = next
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

  send(type: string, payload: unknown): void {
    this.getInstance().send(type, payload)
  },

  subscribeToGame(gameId: string): void {
    this.getInstance().subscribeToGame(gameId)
  },

  joinGame(gameId: string): void {
    this.getInstance().joinGame(gameId)
  },

  setReady(gameId: string, isReady: boolean): void {
    this.getInstance().setReady(gameId, isReady)
  }
}


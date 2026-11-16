/**
 * WebSocketClient - Pure WebSocket connection management
 * 
 * This service ONLY handles:
 * - Connection lifecycle (connect, disconnect, reconnect)
 * - Sending commands and matching each `ok` or `error` to its request by id
 * - Emitting raw messages to handlers
 * 
 * It does NOT:
 * - Import or mutate the store
 * - Transform message data
 * - Handle game-specific logic
 */

import { WS_MESSAGE_TYPES } from '@santorini/shared'
import type { OkMessage, WireError } from '@santorini/shared'
import { ErrorType, GameError } from '@/shared/utils/errorHandler'
import { gameApi } from './gameApi'
import { RECONNECTION_DELAY } from '@/game/model/gameConstants'

interface WebSocketMessage {
  type: string
  id?: string
  payload: unknown
}

interface PendingRequest {
  resolve: (result: OkMessage['payload']) => void
  reject: (error: Error) => void
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
  private pending = new Map<string, PendingRequest>()
  private lastRequestId = 0

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
    this.rejectPendingRequests(new Error('Disconnected'))

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
   * Send a command and wait for the server's answer: the `ok` payload, or a rejection with the server's error.
   */
  request(type: string, payload: unknown): Promise<OkMessage['payload']> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error(`WebSocket not connected. State: ${this.socket?.readyState ?? 'null'}`))
    }

    const id = String(++this.lastRequestId)
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.socket?.send(JSON.stringify({ type, id, payload }))
    })
  }

  // ─────────────────────────────────────────────────────────────
  // Game-specific convenience methods (just wrap send)
  // ─────────────────────────────────────────────────────────────

  subscribeToGame(gameId: string): Promise<OkMessage['payload']> {
    return this.request(WS_MESSAGE_TYPES.SUBSCRIBE_GAME, { gameId: parseInt(gameId) })
  }

  unsubscribeFromGame(gameId: string): void {
    console.log('Unsubscribe requested (cleanup on disconnect):', gameId)
  }

  joinGame(gameId: string): Promise<OkMessage['payload']> {
    return this.request(WS_MESSAGE_TYPES.JOIN_GAME, { gameId: parseInt(gameId) })
  }

  setReady(gameId: string, isReady: boolean): Promise<OkMessage['payload']> {
    return this.request(WS_MESSAGE_TYPES.SET_READY, { gameId: parseInt(gameId), isReady })
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
      ticket = await gameApi.createWebSocketTicket()
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
      events.onConnectionChange(true)
    }

    this.socket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        if (!this.settleRequest(message)) {
          events.onMessage(message.type, message.payload)
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.socket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason)
      this.rejectPendingRequests(new Error('Connection closed'))
      events.onConnectionChange(false)
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

  // An ok or error that answers a request is handed to its caller. Anything else is an event for the update layer.
  private settleRequest(message: WebSocketMessage): boolean {
    const request = message.id === undefined ? undefined : this.pending.get(message.id)
    if (!request || message.id === undefined) return false

    this.pending.delete(message.id)
    if (message.type === WS_MESSAGE_TYPES.OK) {
      request.resolve(message.payload as OkMessage['payload'])
    } else {
      const { code, message: text, details } = message.payload as WireError
      request.reject(new GameError(ErrorType.WEBSOCKET, text, code, details))
    }
    return true
  }

  private rejectPendingRequests(reason: Error): void {
    this.pending.forEach((request) => request.reject(reason))
    this.pending.clear()
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

  request(type: string, payload: unknown): Promise<OkMessage['payload']> {
    return this.getInstance().request(type, payload)
  },

  subscribeToGame(gameId: string): Promise<OkMessage['payload']> {
    return this.getInstance().subscribeToGame(gameId)
  },

  unsubscribeFromGame(gameId: string): void {
    this.getInstance().unsubscribeFromGame(gameId)
  },

  joinGame(gameId: string): Promise<OkMessage['payload']> {
    return this.getInstance().joinGame(gameId)
  },

  setReady(gameId: string, isReady: boolean): Promise<OkMessage['payload']> {
    return this.getInstance().setReady(gameId, isReady)
  }
}


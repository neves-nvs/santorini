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
import type { ConnectionStatus } from '@/game/model/gameStore'
import { gameApi } from './gameApi'
import { CONNECTION_TIMEOUT, RECONNECTION_DELAY } from '@/game/model/gameConstants'

const BACKGROUND_RETRY_DELAY = 15_000

export class ConnectionInterruptedError extends Error {}

interface WebSocketMessage {
  type: string
  id?: string
  payload: unknown
}

interface PendingRequest {
  resolve: (result: OkMessage['payload']) => void
  reject: (error: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

type MessageHandler = (type: string, payload: unknown) => void

export interface SocketEvents {
  onMessage: MessageHandler
  onConnectionChange: (connected: boolean) => void
  onConnectionStatusChange: (status: ConnectionStatus, attempt: number, maxAttempts: number) => void
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
let events: SocketEvents = {
  onMessage: () => {},
  onConnectionChange: () => {},
  onConnectionStatusChange: () => {},
  onReset: () => {}
}

class WebSocketClient {
  private socket: WebSocket | null = null
  private serverAddress = getWebSocketUrl()
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private shouldReconnect = false
  private opening: AbortController | null = null
  private handshakeTimeout: ReturnType<typeof setTimeout> | undefined
  private retryTimeout: ReturnType<typeof setTimeout> | undefined
  private pending = new Map<string, PendingRequest>()
  private lastRequestId = 0

  /**
   * Open the socket and keep it open across drops. A browser cannot set headers on the handshake, so each
   * connection asks the server for a one-time ticket first.
   */
  async connect(): Promise<void> {
    this.shouldReconnect = true
    if (this.socket || this.opening) return

    clearTimeout(this.retryTimeout)
    this.reconnectAttempts = 0
    events.onConnectionStatusChange('connecting', 0, this.maxReconnectAttempts)
    await this.openSocket()
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.shouldReconnect = false
    this.reconnectAttempts = 0
    clearTimeout(this.retryTimeout)
    this.opening?.abort()
    this.opening = null
    this.closeSocket(new ConnectionInterruptedError('Disconnected'))

    events.onConnectionChange(false)
    events.onConnectionStatusChange('disconnected', 0, this.maxReconnectAttempts)
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
    const socket = this.socket
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new ConnectionInterruptedError('WebSocket not connected'))
    }

    const id = String(++this.lastRequestId)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.socket === socket) this.retryConnection(new ConnectionInterruptedError(`WebSocket command timed out: ${type}`))
      }, CONNECTION_TIMEOUT)
      this.pending.set(id, { resolve, reject, timeout })
      try {
        socket.send(JSON.stringify({ type, id, payload }))
      } catch {
        this.retryConnection(new ConnectionInterruptedError(`Could not send WebSocket command: ${type}`))
      }
    })
  }

  // ─────────────────────────────────────────────────────────────
  // Game-specific convenience methods (just wrap send)
  // ─────────────────────────────────────────────────────────────

  async subscribeToGame(gameId: string): Promise<OkMessage['payload']> {
    const socket = this.socket
    const result = await this.request(WS_MESSAGE_TYPES.SUBSCRIBE_GAME, { gameId: parseInt(gameId) })
    if (this.socket === socket) this.reconnectAttempts = 0
    return result
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

  retryConnection(reason = new ConnectionInterruptedError('Reconnecting to game')): void {
    if (!this.socket) return
    this.closeSocket(reason)
    events.onConnectionChange(false)
    this.attemptReconnect()
  }

  private async openSocket(): Promise<void> {
    if (!this.shouldReconnect || this.socket || this.opening) return

    const opening = new AbortController()
    this.opening = opening
    const ticketTimeout = setTimeout(() => opening.abort(), CONNECTION_TIMEOUT)
    try {
      const ticket = await gameApi.createWebSocketTicket(opening.signal)
      if (this.opening !== opening) return
      opening.signal.throwIfAborted()
      this.bindSocket(new WebSocket(`${this.serverAddress}?ticket=${ticket}`))
    } catch (error) {
      if (this.opening === opening) {
        console.error('Failed to open game WebSocket:', error)
        this.attemptReconnect()
      }
    } finally {
      clearTimeout(ticketTimeout)
      if (this.opening === opening) this.opening = null
    }
  }

  private bindSocket(socket: WebSocket): void {
    this.socket = socket
    this.handshakeTimeout = setTimeout(() => {
      if (this.socket === socket) this.retryConnection(new ConnectionInterruptedError('WebSocket handshake timed out'))
    }, CONNECTION_TIMEOUT)

    socket.onopen = () => {
      if (this.socket !== socket) return
      clearTimeout(this.handshakeTimeout)
      console.log('WebSocket connected')
      events.onConnectionStatusChange('connected', 0, this.maxReconnectAttempts)
      events.onConnectionChange(true)
    }

    socket.onmessage = (event) => {
      if (this.socket !== socket) return
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        if (!this.settleRequest(message)) {
          events.onMessage(message.type, message.payload)
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    socket.onclose = (event) => {
      if (this.socket !== socket) return
      console.log('WebSocket closed:', event.code, event.reason)
      this.retryConnection(new ConnectionInterruptedError('Connection closed'))
    }

    socket.onerror = (error) => {
      if (this.socket !== socket) return
      console.error('WebSocket error:', error)
    }
  }

  private attemptReconnect(): void {
    if (!this.shouldReconnect) return

    const backgroundRetry = this.reconnectAttempts >= this.maxReconnectAttempts
    if (!backgroundRetry) this.reconnectAttempts++
    events.onConnectionStatusChange(backgroundRetry ? 'failed' : 'reconnecting', this.reconnectAttempts, this.maxReconnectAttempts)

    clearTimeout(this.retryTimeout)
    this.retryTimeout = setTimeout(() => {
      void this.openSocket()
    }, backgroundRetry ? BACKGROUND_RETRY_DELAY : RECONNECTION_DELAY * this.reconnectAttempts)
  }

  // An ok or error that answers a request is handed to its caller. Anything else is an event for the update layer.
  private settleRequest(message: WebSocketMessage): boolean {
    if (message.type !== WS_MESSAGE_TYPES.OK && message.type !== WS_MESSAGE_TYPES.ERROR) return false
    const request = message.id === undefined ? undefined : this.pending.get(message.id)
    if (!request || message.id === undefined) return false

    this.pending.delete(message.id)
    clearTimeout(request.timeout)
    if (message.type === WS_MESSAGE_TYPES.OK) {
      request.resolve(message.payload as OkMessage['payload'])
    } else {
      const { code, message: text, details } = message.payload as WireError
      request.reject(new GameError(ErrorType.WEBSOCKET, text, code, details))
    }
    return true
  }

  private closeSocket(reason: Error): void {
    clearTimeout(this.handshakeTimeout)
    const socket = this.socket
    this.socket = null
    socket?.close()
    this.pending.forEach((request) => {
      clearTimeout(request.timeout)
      request.reject(reason)
    })
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

  retryConnection(): void {
    instance?.retryConnection()
  },

  joinGame(gameId: string): Promise<OkMessage['payload']> {
    return this.getInstance().joinGame(gameId)
  },

  setReady(gameId: string, isReady: boolean): Promise<OkMessage['payload']> {
    return this.getInstance().setReady(gameId, isReady)
  }
}


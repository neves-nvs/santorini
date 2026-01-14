import type { AvailableMove, GameState, GameStateUpdatePayload, PlayerGameView } from '../types/game'
import { ErrorHandler, ErrorType } from '../../../utils/errorHandler'
import { useGameStore } from '../store/gameStore'
import { RECONNECTION_DELAY } from '../../../constants/gameConstants'

// Import shared WebSocket types
import {
  WS_MESSAGE_TYPES
} from '../../../../../shared/src/websocket-types'

interface WebSocketMessage {
  type: string;
  payload: unknown;
}

// Type guard to check if view is PlayerGameView (has isCurrentPlayer)
function isPlayerGameView(view: GameStateUpdatePayload['state']): view is PlayerGameView {
  return 'isCurrentPlayer' in view
}

export type WebSocketEventHandler = (message: WebSocketMessage) => void

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

export class WebSocketService {
  private socket: WebSocket | null = null
  private serverAddress = getWebSocketUrl()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = RECONNECTION_DELAY
  private eventHandlers: Map<string, WebSocketEventHandler[]> = new Map()
  private isAuthenticated = false
  private lastGameStateHash: string | null = null

  constructor() {
    // Don't auto-connect, wait for authentication
  }

  // Call this after successful login
  public async connectAfterAuth() {
    console.log('🔌 connectAfterAuth called')
    this.isAuthenticated = true

    // Get JWT token from the server
    try {
      const { apiService } = await import('../../../services/ApiService')
      const tokenResponse = await apiService.getToken()
      this.authToken = tokenResponse.token
      console.log('🔑 Got JWT token for WebSocket:', this.authToken ? 'present' : 'missing')
    } catch (error) {
      console.error('🚨 Failed to get JWT token:', error)
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

    console.log('🔌 Calling connect()')
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

    // Update store directly
    const store = useGameStore.getState()
    store.setConnected(false)
    store.setConnecting(false)

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

        // Update store directly
        const store = useGameStore.getState()
        console.log('🔧 Before setConnected - isConnected:', store.isConnected)
        store.setConnected(true)
        store.setConnecting(false)
        console.log('🔧 After setConnected - isConnected:', store.isConnected)

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
        console.log('🔌 WebSocket connection closed:', event.code, event.reason, 'wasCleanClose:', event.wasClean)

        // Update store directly
        const store = useGameStore.getState()
        store.setConnected(false)
        store.setConnecting(false)

        this.emit('disconnected', { connected: false })
        this.attemptReconnect()
      }

      this.socket.onerror = (error) => {
        console.error('🚨 WebSocket error occurred:', error)
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
    if (type === WS_MESSAGE_TYPES.GAME_START || type === WS_MESSAGE_TYPES.GAME_READY_FOR_START ||
        type === WS_MESSAGE_TYPES.PLAYER_READY_STATUS || type === 'error') {
      console.log('🔌 WebSocket message:', type, payload)
    }

    // Handle error messages
    if (type === 'error') {
      console.error('🚨 Server error received:', payload)

      // Just log errors - don't disconnect
      // Note: "Game is full" errors should no longer occur since we only subscribe, not join
      this.emit('server_error', payload)
    }

    // Handle game messages directly
    this.handleGameMessage(type, payload)

    // Emit the specific message type
    this.emit(type, payload)

    // Also emit a general 'message' event
    this.emit('message', message)
  }

  private handleGameMessage(type: string, payload: any) {
    const store = useGameStore.getState()

    switch (type) {
      // Note: connected/disconnected are now handled directly in socket event handlers

      case WS_MESSAGE_TYPES.AVAILABLE_MOVES:
        console.log('🎯 Available moves:', payload)

        // Handle both formats: payload as array directly, or payload.moves as array
        let moves: any[] = []
        if (Array.isArray(payload)) {
          moves = payload
        } else if (payload && Array.isArray(payload.moves)) {
          moves = payload.moves
        }

        // Transform moves to expected format
        const transformedMoves = moves.map((move: any) => ({
          type: move.type,
          workerId: move.workerId || 1,
          validPositions: move.position ? [move.position] : (move.validPositions || [])
        }))

        console.log('🎯 Setting new available moves and my turn = true')
        store.setCurrentPlayerMoves(transformedMoves)
        store.setMyTurn(true)
        break

      case WS_MESSAGE_TYPES.GAME_STATE_UPDATE:
        console.log('🎮 Game state update:', payload)
        this.handleGameStateUpdate(payload as GameStateUpdatePayload, store)
        break

      case WS_MESSAGE_TYPES.PLAYERS_IN_GAME:
        console.log('👥 Players in game update:', payload)
        // This message is sent when players join/leave the game
        // The server should also send a game_state_update message with the full updated state
        // So we just log this for now - the game_state_update will handle the actual update
        break

      case 'move_acknowledged':
        console.log('✅ Move acknowledged:', payload)
        // Just acknowledge - don't clear moves here
        break

      case WS_MESSAGE_TYPES.GAME_START:
        console.log('🎮 Game started:', payload)
        // Game has started - the game_state_update message will follow with the new state
        // Just log this for now, the state update will handle the UI transition
        break

      case WS_MESSAGE_TYPES.GAME_READY_FOR_START:
        console.log('🎮 Game ready for start:', payload)
        // All players have joined and game is ready to start
        break

      case WS_MESSAGE_TYPES.PLAYER_READY_STATUS:
        console.log('👥 Player ready status update:', payload)
        // Update the game store with ready status information
        if (payload && Array.isArray(payload)) {
          const readyCount = payload.filter((p: { isReady: boolean }) => p.isReady).length
          const totalPlayers = payload.length
          console.log(`🎯 Ready status: ${readyCount}/${totalPlayers} players ready`)

          // Store ready status in game state for UI updates
          const currentGameState = store.gameState
          if (currentGameState) {
            store.setGameState({
              ...currentGameState,
              playersReadyStatus: payload,
              readyCount,
              totalPlayers
            })
          }
        }
        break

      default:
        // Let other message types pass through to event handlers
        break
    }
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
      this.send(WS_MESSAGE_TYPES.SUBSCRIBE_GAME, { gameId })
    } else {
      console.warn('⚠️ WebSocket not ready for subscription. State:', this.socket?.readyState)
      // Retry with exponential backoff if connection is still connecting
      if (this.socket?.readyState === WebSocket.CONNECTING) {
        console.log('🔄 WebSocket connecting, retrying subscription in 500ms...')
        setTimeout(() => {
          this.subscribeToGame(gameId)
        }, 500)
      } else if (!this.socket) {
        console.log('🔄 No WebSocket instance, attempting to connect and retry...')
        // Try to connect and then retry
        this.connectAfterAuth().then(() => {
          setTimeout(() => {
            this.subscribeToGame(gameId)
          }, 1000)
        }).catch(error => {
          console.error('Failed to connect WebSocket for subscription:', error)
        })
      }
    }
  }

  unsubscribeFromGame(gameId: string) {
    // No longer needed - server automatically cleans up on connection close
    console.log('📡 Unsubscribe from game requested (automatic cleanup on disconnect):', gameId)
  }

  joinGame(gameId: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('🎮 Joining game:', gameId)
      this.send(WS_MESSAGE_TYPES.JOIN_GAME, { gameId: parseInt(gameId) })
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

  setReady(gameId: string, isReady: boolean) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('🎯 Setting ready status:', { gameId, isReady })
      this.send(WS_MESSAGE_TYPES.SET_READY, { gameId: parseInt(gameId), isReady })
    } else {
      console.warn('⚠️ WebSocket not ready for setting ready. State:', this.socket?.readyState)
      throw new Error('WebSocket not connected')
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

  /**
   * Handle game_state_update messages from server
   * Backend sends: { type: 'game_state_update', payload: { gameId, version, state: PlayerGameView } }
   */
  private handleGameStateUpdate(payload: GameStateUpdatePayload, store: ReturnType<typeof useGameStore.getState>) {
    // Extract the actual game state from payload.state
    const gameView = payload.state
    if (!gameView) {
      console.warn('🎮 Game state update missing state field:', payload)
      return
    }

    // Create hash for deduplication
    const gameStateHash = JSON.stringify({
      gameId: gameView.gameId,
      version: gameView.version,
      phase: gameView.phase,
      currentPlayerId: gameView.currentPlayerId,
      turnNumber: gameView.turnNumber
    })

    if (this.lastGameStateHash === gameStateHash) {
      console.log('🔄 Skipping duplicate game state update')
      return
    }
    this.lastGameStateHash = gameStateHash

    // Check if this is a PlayerGameView (has isCurrentPlayer) or SpectatorGameView
    const isPlayer = isPlayerGameView(gameView)
    const isCurrentPlayer = isPlayer ? gameView.isCurrentPlayer : false
    const availableMoves = isPlayer ? gameView.availableMoves : undefined

    console.log('👥 Players in game state:', gameView.players)
    console.log('🎯 Is current player:', isCurrentPlayer)
    console.log('🎯 Available moves:', availableMoves?.length || 0)

    // Convert to GameState format expected by store
    const gameState: GameState = {
      gameId: gameView.gameId,
      status: gameView.status,
      phase: gameView.phase,
      currentPlayerId: gameView.currentPlayerId,
      turnNumber: gameView.turnNumber,
      version: gameView.version,
      board: gameView.board,
      players: gameView.players,
      availableMoves: availableMoves,
      winnerId: gameView.winnerId ?? undefined,
      winReason: gameView.winReason ?? undefined,
      isCurrentPlayer: isCurrentPlayer,
      isMyTurn: isCurrentPlayer
    }

    store.setGameState(gameState)

    // Handle available moves - they come with the game state now
    if (isCurrentPlayer && availableMoves && availableMoves.length > 0) {
      // Transform moves to UI format
      const transformedMoves = this.transformMovesToUIFormat(availableMoves)
      console.log('🎯 Setting available moves for current player:', transformedMoves.length)
      store.setCurrentPlayerMoves(transformedMoves)
      store.setMyTurn(true)
    } else {
      console.log('🧹 Not current player or no moves - clearing moves')
      store.setCurrentPlayerMoves([])
      store.setMyTurn(false)
    }
  }

  /**
   * Transform server moves to UI format (grouped by worker with valid positions)
   */
  private transformMovesToUIFormat(moves: PlayerGameView['availableMoves']): AvailableMove[] {
    if (!moves || moves.length === 0) return []

    // Group moves by type and workerId
    const grouped = new Map<string, AvailableMove>()

    for (const move of moves) {
      const key = `${move.type}-${move.workerId}`

      if (!grouped.has(key)) {
        grouped.set(key, {
          type: move.type,
          workerId: move.workerId,
          validPositions: []
        })
      }

      const group = grouped.get(key)!
      group.validPositions.push(move.position)
    }

    return Array.from(grouped.values())
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

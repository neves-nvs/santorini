/**
 * GameMessageHandler - Decouples WebSocket messages from store mutations
 * 
 * This layer:
 * 1. Receives raw WebSocket messages
 * 2. Transforms data to the format expected by the store
 * 3. Dispatches actions to the store
 * 
 * Benefits:
 * - WebSocketClient stays pure (connection only)
 * - Single place for message → state mapping
 * - Easy to test message handling in isolation
 * - Clear data flow: WS → Handler → Store → Components
 */

import { useGameStore } from '@/store/gameStore'
import { useAppStore } from '@/store/appStore'
import type { AvailableMove, GameState, GameStateUpdatePayload, PlayerGameView } from '@/types/game'
import { WS_MESSAGE_TYPES } from '@santorini/shared'
import { log, logError, logWarn } from '@/utils/log'

// Type guard for PlayerGameView (has isCurrentPlayer field)
function isPlayerGameView(view: GameStateUpdatePayload['state']): view is PlayerGameView {
  return 'isCurrentPlayer' in view
}

// Track last state hash to prevent duplicate updates
let lastGameStateHash: string | null = null

/**
 * Main message handler - called from WebSocketClient.onmessage
 */
export function handleWebSocketMessage(type: string, payload: unknown): void {
  const store = useGameStore.getState()

  switch (type) {
    case WS_MESSAGE_TYPES.GAME_STATE_UPDATE:
      handleGameStateUpdate(payload as GameStateUpdatePayload, store)
      break

    case WS_MESSAGE_TYPES.PLAYER_JOINED:
      log('Player joined:', payload)
      // Full game_state_update follows - UI will update from that
      break

    case WS_MESSAGE_TYPES.PLAYER_LEFT:
      log('Player left:', payload)
      // Full game_state_update follows - UI will update from that
      break

    case WS_MESSAGE_TYPES.GAME_JOINED:
      log('Game joined:', payload)
      handleGameJoined(payload, store)
      break

    case 'error':
      logError('Server error:', payload)
      break

    default:
      log('Unhandled message type:', type, payload)
  }
}

/**
 * Handle game_state_update messages
 */
function handleGameStateUpdate(
  payload: GameStateUpdatePayload,
  store: ReturnType<typeof useGameStore.getState>
): void {
  const gameView = payload.state
  if (!gameView) {
    logWarn('Game state update missing state field:', payload)
    return
  }

  // Deduplicate by hashing key fields including board state
  const stateHash = JSON.stringify({
    gameId: gameView.gameId,
    version: gameView.version,
    phase: gameView.phase,
    currentPlayerId: gameView.currentPlayerId,
    turnNumber: gameView.turnNumber,
    playerCount: gameView.players.length,
    // Include board hash to detect worker placements
    boardHash: gameView.board?.cells ? JSON.stringify(gameView.board.cells) : ''
  })

  if (lastGameStateHash === stateHash) {
    log('Skipping duplicate game state update')
    return
  }
  lastGameStateHash = stateHash

  // Determine if current user is the active player
  const isPlayer = isPlayerGameView(gameView)
  const isCurrentPlayer = isPlayer ? gameView.isCurrentPlayer : false
  const availableMoves = isPlayer ? gameView.availableMoves : undefined

  log('Processing game state - phase:', gameView.phase, 'isCurrentPlayer:', isCurrentPlayer)

  // Compute currentUserReady from players array
  // Get the current user's ID from the app store (single source of truth)
  const currentUserId = useAppStore.getState().userId
  const currentUserPlayer = currentUserId ? gameView.players.find(p => p.userId === currentUserId) : undefined
  const currentUserReady = currentUserPlayer?.isReady ?? false

  log('Current user ready status:', { currentUserId, currentUserReady, players: gameView.players })

  // Convert to GameState format
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
    isMyTurn: isCurrentPlayer,
    currentUserReady: currentUserReady
  }

  store.setGameState(gameState)

  // Handle available moves
  if (isCurrentPlayer && availableMoves && availableMoves.length > 0) {
    const transformedMoves = transformMovesToUIFormat(availableMoves)
    store.setCurrentPlayerMoves(transformedMoves)
    store.setMyTurn(true)
  } else {
    store.setCurrentPlayerMoves([])
    store.setMyTurn(false)
  }
}

/**
 * Handle game_joined messages
 * Sent when a player joins/reconnects to a game
 * Note: subscribe_game also sends game_state_update with the same data,
 * so we just log here. The game_state_update handler will process the state.
 */
function handleGameJoined(
  _payload: unknown,
  _store: ReturnType<typeof useGameStore.getState>
): void {
  // game_state_update from subscribe_game will handle the actual state update
  // This message just confirms we've joined the game
}

/**
 * Transform server moves to UI format (grouped by worker with valid positions)
 * For move_worker moves, stores the fromPosition in each valid position entry
 */
function transformMovesToUIFormat(moves: PlayerGameView['availableMoves']): AvailableMove[] {
  if (!moves || moves.length === 0) return []

  // Group moves by type and workerId
  const grouped = new Map<string, AvailableMove>()

  for (const move of moves) {
    const key = `${move.type}-${move.workerId}`

    if (!grouped.has(key)) {
      // For move_worker moves, include fromPosition at the group level
      const baseMove: AvailableMove = {
        type: move.type,
        workerId: move.workerId,
        validPositions: []
      }
      // Store fromPosition for move_worker moves (all moves for same worker have same fromPosition)
      if (move.type === 'move_worker' && 'fromPosition' in move) {
        baseMove.fromPosition = move.fromPosition
      }
      grouped.set(key, baseMove)
    }

    grouped.get(key)!.validPositions.push(move.position)
  }

  return Array.from(grouped.values())
}

/**
 * Reset message handler state (call on disconnect/game change)
 */
export function resetMessageHandlerState(): void {
  lastGameStateHash = null
}

/**
 * Handle connection state changes
 */
export function handleConnectionChange(connected: boolean): void {
  const store = useGameStore.getState()
  store.setConnected(connected)
  store.setConnecting(false)

  if (!connected) {
    resetMessageHandlerState()
  }
}


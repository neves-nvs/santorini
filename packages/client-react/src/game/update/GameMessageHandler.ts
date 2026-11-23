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

import { useGameStore } from '@/game/model/gameStore'
import type { ConnectionStatus } from '@/game/model/gameStore'
import { useAppStore } from '@/user/model/appStore'
import type { AvailableMove, GameState, GameView, Move } from '@/game/model/game'
import { WS_MESSAGE_TYPES } from '@santorini/shared'
import { log, logError } from '@/shared/utils/log'

// The newest version of each game this client has shown. Every game_state is a whole snapshot, so one that is not
// newer (an old one, or the same one twice) changes nothing and is dropped.
const lastVersionByGame = new Map<number, number>()

/**
 * Main message handler - called from WebSocketClient.onmessage
 */
export function handleWebSocketMessage(type: string, payload: unknown): void {
  switch (type) {
    case WS_MESSAGE_TYPES.GAME_STATE:
      applyGameView(payload as GameView)
      break

    case WS_MESSAGE_TYPES.ERROR:
      logError('Server error:', payload)
      break

    default:
      log('Unhandled message type:', type, payload)
  }
}

/**
 * Show a game as the server sees it for this user. Used for game_state messages and for the REST snapshot.
 */
export function applyGameView(gameView: GameView): void {
  if (gameView.version <= (lastVersionByGame.get(gameView.gameId) ?? -1)) {
    log('Ignoring a game state that is not newer than the one shown')
    return
  }
  lastVersionByGame.set(gameView.gameId, gameView.version)

  const store = useGameStore.getState()
  const { viewer } = gameView
  const isCurrentPlayer = viewer.role === 'player' && viewer.isCurrentPlayer
  const serverMoves = viewer.role === 'player' ? viewer.availableMoves : []

  log('Processing game state - phase:', gameView.phase, 'isCurrentPlayer:', isCurrentPlayer)

  // The current user's ready status comes from the players list
  const currentUserId = useAppStore.getState().userId
  const currentUserPlayer = currentUserId ? gameView.players.find(p => p.userId === currentUserId) : undefined

  const gameState: GameState = {
    gameId: gameView.gameId,
    status: gameView.status,
    phase: gameView.phase,
    currentSeat: gameView.currentSeat,
    turnNumber: gameView.turnNumber,
    version: gameView.version,
    board: gameView.board,
    players: gameView.players,
    availableMoves: isCurrentPlayer ? transformMovesToUIFormat(serverMoves) : [],
    winnerUserId: gameView.winnerUserId ?? undefined,
    winReason: gameView.winReason ?? undefined,
    isCurrentPlayer,
    currentUserReady: currentUserPlayer?.isReady ?? false,
    totalPlayers: gameView.maxPlayers
  }

  store.setGameState(gameState)
}

/**
 * Transform server moves to UI format (grouped by worker with valid positions)
 * For move_worker moves, stores the fromPosition in each valid position entry
 */
function transformMovesToUIFormat(moves: Move[]): AvailableMove[] {
  if (moves.length === 0) return []

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
  lastVersionByGame.clear()
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

export function handleConnectionStatusChange(
  status: ConnectionStatus,
  attempt: number,
  maxAttempts: number
): void {
  useGameStore.getState().setConnectionStatus(status, attempt, maxAttempts)
}


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
import type { AvailableMove, GameState } from '@/types/game'
import type {
  GameEndPayload,
  GameStartPayload,
  GameStateUpdatePayload,
  Move,
  PlayerGameView,
  ServerMessage,
  SpectatorGameView,
} from '@santorini/shared'
import { WS_MESSAGE_TYPES } from '@santorini/shared'
import { log, logError } from '@/utils/log'

type GameStoreState = ReturnType<typeof useGameStore.getState>

function isPlayerGameView(view: PlayerGameView | SpectatorGameView): view is PlayerGameView {
  return 'isCurrentPlayer' in view
}

function hasState(payload: GameStateUpdatePayload | GameEndPayload): payload is GameStateUpdatePayload {
  return 'state' in payload
}

function assertNever(message: never): never {
  throw new Error(`Unhandled server message: ${JSON.stringify(message)}`)
}

// Track last state hash to prevent duplicate updates
let lastGameStateHash: string | null = null

/**
 * Main message handler - called from WebSocketClient.onmessage
 */
export function handleWebSocketMessage(message: ServerMessage): void {
  const store = useGameStore.getState()

  switch (message.type) {
    case WS_MESSAGE_TYPES.GAME_STATE_UPDATE:
      handleGameStateUpdate(message.payload, store)
      break

    case WS_MESSAGE_TYPES.GAME_START:
      log('Game started:', message.payload)
      handleGameStart(message.payload, store)
      break

    case WS_MESSAGE_TYPES.ERROR:
      logError('Server error:', message.payload)
      break

    // The next game_state_update carries the state these messages announce
    case WS_MESSAGE_TYPES.GAME_CREATED:
    case WS_MESSAGE_TYPES.GAME_JOINED:
    case WS_MESSAGE_TYPES.GAMES_LIST:
    case WS_MESSAGE_TYPES.GAME_LEFT:
    case WS_MESSAGE_TYPES.PLAYER_JOINED:
    case WS_MESSAGE_TYPES.PLAYER_LEFT:
    case WS_MESSAGE_TYPES.READY_STATUS_UPDATE:
      log(message.type, message.payload)
      break

    default:
      assertNever(message)
  }
}

/**
 * Handle game_state_update messages
 */
function handleGameStateUpdate(payload: GameStateUpdatePayload | GameEndPayload, store: GameStoreState): void {
  if (!hasState(payload)) {
    log('Game ended:', payload)
    return
  }

  const gameView = payload.state

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
 * Handle game_start messages
 */
function handleGameStart(data: GameStartPayload, store: GameStoreState): void {
  log('Processing game start - activePlayerId:', data.activePlayerId)

  // Check if current user is the active player
  const currentUserId = useAppStore.getState().userId
  const gameState = store.gameState
  const currentPlayer = gameState?.players.find(p => p.userId === currentUserId)
  const isCurrentPlayer = currentPlayer ? data.activePlayerId === currentPlayer.id : false

  log('Is current player:', isCurrentPlayer, 'userId:', currentUserId, 'playerId:', currentPlayer?.id)

  // Update game state with new status/phase
  if (gameState) {
    store.setGameState({
      ...gameState,
      status: 'in-progress',
      phase: 'placing',
      currentPlayerId: data.activePlayerId,
      isCurrentPlayer
    })
  }

  store.setMyTurn(isCurrentPlayer)

  // Handle available moves (only present for active player)
  if (isCurrentPlayer && data.availableMoves && data.availableMoves.length > 0) {
    const transformedMoves = transformMovesToUIFormat(data.availableMoves)
    store.setCurrentPlayerMoves(transformedMoves)
    log('Set available moves:', transformedMoves.length)
  } else {
    store.setCurrentPlayerMoves([])
  }
}

/**
 * Transform server moves to UI format (grouped by worker with valid positions)
 * A move_worker group keeps the square the worker moves from
 */
function transformMovesToUIFormat(moves: Move[]): AvailableMove[] {
  const grouped = new Map<string, AvailableMove>()

  for (const move of moves) {
    const key = `${move.type}-${move.workerId}`
    const group = grouped.get(key)

    if (group) {
      group.validPositions.push(move.position)
    } else if (move.type === 'move_worker') {
      grouped.set(key, { type: move.type, workerId: move.workerId, fromPosition: move.fromPosition, validPositions: [move.position] })
    } else {
      grouped.set(key, { type: move.type, workerId: move.workerId, validPositions: [move.position] })
    }
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


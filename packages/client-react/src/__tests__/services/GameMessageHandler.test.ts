import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleWebSocketMessage, resetMessageHandlerState } from '@/services/GameMessageHandler'
import { useAppStore } from '@/store/appStore'
import { useGameStore } from '@/store/gameStore'
import type {
  BoardView,
  Move,
  PlayerGameView,
  PlayerView,
  ServerMessage,
  SpectatorGameView,
} from '@santorini/shared'

const ME = { id: 11, userId: 1, seat: 0, status: 'active', isReady: true } satisfies PlayerView
const OPPONENT = { id: 12, userId: 2, seat: 1, status: 'active', isReady: false } satisfies PlayerView

const emptyBoard = (): BoardView => ({
  cells: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ({ height: 0, hasDome: false, worker: null }))),
})

const placeMoves: Move[] = [
  { type: 'place_worker', workerId: 1, position: { x: 0, y: 0 } },
  { type: 'place_worker', workerId: 1, position: { x: 2, y: 3 } },
]

const playerView = (overrides: Partial<PlayerGameView> = {}): PlayerGameView => ({
  gameId: 7,
  status: 'in-progress',
  phase: 'placing',
  currentPlayerId: ME.id,
  turnNumber: 1,
  version: 3,
  board: emptyBoard(),
  players: [ME, OPPONENT],
  availableMoves: placeMoves,
  isCurrentPlayer: true,
  ...overrides,
})

const stateUpdate = (state: PlayerGameView | SpectatorGameView): ServerMessage => ({
  type: 'game_state_update',
  payload: { gameId: state.gameId, version: state.version, state },
})

const store = () => useGameStore.getState()

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  resetMessageHandlerState()
  store().resetGame()
  useAppStore.setState({ userId: ME.userId, username: 'me' })
})

describe('game_state_update', () => {
  it('stores the state and the moves of the player whose turn it is', () => {
    handleWebSocketMessage(stateUpdate(playerView()))

    expect(store().gameState).toMatchObject({ gameId: 7, phase: 'placing', currentPlayerId: ME.id, isCurrentPlayer: true })
    expect(store().isMyTurn).toBe(true)
    expect(store().currentPlayerMoves).toEqual([
      { type: 'place_worker', workerId: 1, validPositions: [{ x: 0, y: 0 }, { x: 2, y: 3 }] },
    ])
  })

  it('groups moves by type and worker and keeps where a worker moves from', () => {
    const moves: Move[] = [
      { type: 'move_worker', workerId: 5, fromPosition: { x: 1, y: 1 }, position: { x: 1, y: 2 } },
      { type: 'move_worker', workerId: 5, fromPosition: { x: 1, y: 1 }, position: { x: 2, y: 2 } },
      { type: 'move_worker', workerId: 6, fromPosition: { x: 4, y: 4 }, position: { x: 3, y: 3 } },
      { type: 'build_block', workerId: 5, position: { x: 0, y: 0 } },
    ]

    handleWebSocketMessage(stateUpdate(playerView({ phase: 'moving', availableMoves: moves })))

    expect(store().currentPlayerMoves).toEqual([
      { type: 'move_worker', workerId: 5, fromPosition: { x: 1, y: 1 }, validPositions: [{ x: 1, y: 2 }, { x: 2, y: 2 }] },
      { type: 'move_worker', workerId: 6, fromPosition: { x: 4, y: 4 }, validPositions: [{ x: 3, y: 3 }] },
      { type: 'build_block', workerId: 5, validPositions: [{ x: 0, y: 0 }] },
    ])
  })

  it('clears moves and the turn when it is not my turn', () => {
    store().setMyTurn(true)
    store().setCurrentPlayerMoves([{ type: 'place_worker', workerId: 1, validPositions: [{ x: 0, y: 0 }] }])

    handleWebSocketMessage(stateUpdate(playerView({ currentPlayerId: OPPONENT.id, isCurrentPlayer: false, availableMoves: undefined })))

    expect(store().isMyTurn).toBe(false)
    expect(store().currentPlayerMoves).toEqual([])
  })

  it('accepts a spectator view, which has no turn and no moves', () => {
    const spectator: SpectatorGameView = {
      gameId: 7,
      status: 'in-progress',
      phase: 'moving',
      currentPlayerId: OPPONENT.id,
      turnNumber: 4,
      version: 9,
      board: emptyBoard(),
      players: [ME, OPPONENT],
      winnerId: null,
      winReason: null,
    }

    handleWebSocketMessage(stateUpdate(spectator))

    expect(store().gameState).toMatchObject({ gameId: 7, isCurrentPlayer: false })
    expect(store().gameState?.winnerId).toBeUndefined()
    expect(store().currentPlayerMoves).toEqual([])
  })

  it('works out whether the signed-in user is ready from the players', () => {
    handleWebSocketMessage(stateUpdate(playerView({ players: [{ ...ME, isReady: true }, OPPONENT] })))
    expect(store().gameState?.currentUserReady).toBe(true)

    handleWebSocketMessage(stateUpdate(playerView({ version: 4, players: [{ ...ME, isReady: false }, OPPONENT] })))
    expect(store().gameState?.currentUserReady).toBe(false)
  })

  it('keeps the winner of a finished game', () => {
    handleWebSocketMessage(
      stateUpdate(playerView({ status: 'completed', winnerId: ME.id, winReason: 'reached level 3', availableMoves: undefined })),
    )

    expect(store().gameState).toMatchObject({ status: 'completed', winnerId: ME.id, winReason: 'reached level 3' })
  })

  it('skips an update identical to the last one', () => {
    const states: unknown[] = []
    handleWebSocketMessage(stateUpdate(playerView()))
    const unsubscribe = useGameStore.subscribe((state) => states.push(state))

    handleWebSocketMessage(stateUpdate(playerView()))
    expect(states).toHaveLength(0)

    handleWebSocketMessage(stateUpdate(playerView({ version: 4 })))
    expect(states.length).toBeGreaterThan(0)
    unsubscribe()
  })

})

describe('game_start', () => {
  const started = (activePlayerId: number, availableMoves?: Move[]): ServerMessage => ({
    type: 'game_start',
    payload: { gameId: 7, activePlayerId, availableMoves },
  })

  beforeEach(() => {
    handleWebSocketMessage(stateUpdate(playerView({ status: 'waiting', phase: null, currentPlayerId: null, isCurrentPlayer: false, availableMoves: undefined })))
  })

  it('starts the game and gives the first player their moves', () => {
    handleWebSocketMessage(started(ME.id, placeMoves))

    expect(store().gameState).toMatchObject({ status: 'in-progress', phase: 'placing', currentPlayerId: ME.id, isCurrentPlayer: true })
    expect(store().isMyTurn).toBe(true)
    expect(store().currentPlayerMoves).toHaveLength(1)
  })

  it('starts the game for the player who waits', () => {
    handleWebSocketMessage(started(OPPONENT.id))

    expect(store().gameState).toMatchObject({ status: 'in-progress', currentPlayerId: OPPONENT.id, isCurrentPlayer: false })
    expect(store().isMyTurn).toBe(false)
    expect(store().currentPlayerMoves).toEqual([])
  })

  it('does nothing to the game state before a state has arrived', () => {
    store().resetGame()

    expect(() => handleWebSocketMessage(started(ME.id, placeMoves))).not.toThrow()

    expect(store().gameState).toBeNull()
  })
})

describe('messages the client takes no action on', () => {
  const informational: ServerMessage[] = [
    { type: 'game_joined', payload: { gameId: 7, gameState: playerView() } },
    { type: 'player_joined', payload: { gameId: 7, userId: 2, playerCount: 2, maxPlayers: 2 } },
    { type: 'player_left', payload: { gameId: 7, userId: 2, playerCount: 1, maxPlayers: 2 } },
    { type: 'ready_status_update', payload: { ready: true, allReady: false, gameStarted: false } },
  ]

  it.each(informational.map((message) => [message.type, message] as const))('%s leaves the store alone', (_type, message) => {
    handleWebSocketMessage(stateUpdate(playerView()))
    const before = store()

    expect(() => handleWebSocketMessage(message)).not.toThrow()

    expect(store().gameState).toBe(before.gameState)
    expect(store().currentPlayerMoves).toBe(before.currentPlayerMoves)
  })
})

describe('error', () => {
  it('is reported as an error', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    handleWebSocketMessage({ type: 'error', payload: 'Not your turn' })

    expect(error).toHaveBeenCalledWith('Server error:', 'Not your turn')
  })
})

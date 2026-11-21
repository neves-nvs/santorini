import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyGameView, handleWebSocketMessage, resetMessageHandlerState } from '@/game/update/GameMessageHandler'
import type { CompletedGameView, InProgressGameView, Move } from '@santorini/shared'
import { useAppStore } from '@/user/model/appStore'
import { useGameStore } from '@/game/model/gameStore'

const ME = 10
const OPPONENT = 11

const placeAt = (x: number, y: number): Move => ({ type: 'place_worker', workerId: 1, position: { x, y } })

const view = (overrides: Partial<InProgressGameView> = {}): InProgressGameView => ({
  gameId: 5,
  status: 'in-progress',
  phase: 'placing',
  maxPlayers: 3,
  currentSeat: 0,
  turnNumber: 1,
  version: 4,
  board: { cells: [] },
  players: [
    { userId: ME, status: 'active', isReady: true },
    { userId: OPPONENT, status: 'active', isReady: false },
  ],
  winnerUserId: null,
  winReason: null,
  viewer: { role: 'player', isCurrentPlayer: true, availableMoves: [placeAt(0, 0), placeAt(2, 3)] },
  ...overrides,
})

describe('game_state', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    resetMessageHandlerState()
    useGameStore.setState({ gameState: null, currentPlayerMoves: [], isMyTurn: false })
    useAppStore.setState({ userId: ME })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the game, the moves of the player whose turn it is, and their ready status', () => {
    handleWebSocketMessage('game_state', view())

    const { gameState, currentPlayerMoves, isMyTurn } = useGameStore.getState()
    expect(gameState).toMatchObject({ gameId: 5, version: 4, isCurrentPlayer: true, currentUserReady: true, totalPlayers: 3 })
    expect(currentPlayerMoves).toEqual([
      { type: 'place_worker', workerId: 1, validPositions: [{ x: 0, y: 0 }, { x: 2, y: 3 }] },
    ])
    expect(isMyTurn).toBe(true)
  })

  it('has no moves and no turn for a player who waits, or for a spectator', () => {
    handleWebSocketMessage(
      'game_state',
      view({ viewer: { role: 'player', isCurrentPlayer: false, availableMoves: [] } })
    )
    expect(useGameStore.getState()).toMatchObject({ currentPlayerMoves: [], isMyTurn: false })

    handleWebSocketMessage('game_state', view({ version: 5, viewer: { role: 'spectator' } }))
    expect(useGameStore.getState()).toMatchObject({ currentPlayerMoves: [], isMyTurn: false })
    expect(useGameStore.getState().gameState?.isCurrentPlayer).toBe(false)
  })

  it('shows the winner of a finished game', () => {
    const finished: CompletedGameView = {
      ...view(),
      status: 'completed',
      phase: null,
      currentSeat: null,
      winnerUserId: OPPONENT,
      winReason: 'win_condition',
    }

    handleWebSocketMessage('game_state', finished)

    expect(useGameStore.getState().gameState).toMatchObject({
      status: 'completed',
      winnerUserId: OPPONENT,
      winReason: 'win_condition',
    })
  })

  it('drops a state that is not newer than the one shown', () => {
    applyGameView(view({ version: 6 }))

    applyGameView(view({ version: 5, turnNumber: 99 }))
    applyGameView(view({ version: 6, turnNumber: 98 }))

    expect(useGameStore.getState().gameState).toMatchObject({ version: 6, turnNumber: 1 })
  })

  it('shows the next state even when the board looks the same', () => {
    applyGameView(view({ version: 6 }))

    applyGameView(view({ version: 7, players: [{ userId: ME, status: 'active', isReady: false }] }))

    expect(useGameStore.getState().gameState).toMatchObject({ version: 7, currentUserReady: false })
  })

  it('counts the versions of each game on its own, and starts over after a reset', () => {
    applyGameView(view({ gameId: 5, version: 6 }))
    applyGameView(view({ gameId: 8, version: 1 }))
    expect(useGameStore.getState().gameState?.gameId).toBe(8)

    resetMessageHandlerState()
    applyGameView(view({ gameId: 5, version: 2 }))

    expect(useGameStore.getState().gameState).toMatchObject({ gameId: 5, version: 2 })
  })
})

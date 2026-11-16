import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameLifecycle } from '@/hooks/useGameLifecycle'
import { useGameStore } from '@/store/gameStore'
import type { GameState, PlayerView } from '@/types/game'

const player = (id: number, isReady: boolean): PlayerView => ({ id, userId: id, seat: id - 1, status: 'active', isReady })

const waitingGame = (players: PlayerView[]): GameState => ({
  gameId: 7,
  status: 'waiting',
  phase: null,
  currentPlayerId: null,
  turnNumber: 0,
  version: 1,
  board: { cells: [] },
  players,
  isCurrentPlayer: false,
})

describe('useGameLifecycle', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame()
  })

  it('counts the players who are ready', () => {
    const { result } = renderHook(() => useGameLifecycle())

    act(() => useGameStore.getState().setGameState(waitingGame([player(1, true), player(2, false)])))

    expect(result.current.gameInfo.currentPlayers).toBe(2)
    expect(result.current.gameInfo.readyCount).toBe(1)
    expect(result.current.statusMessage).toBe('Waiting for players (1/2 ready)')
  })
})

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from '@/game/model/gameStore'
import type { GameState } from '@/game/model/game'
import { useAppStore } from '@/user/model/appStore'
import { useReadyState } from '@/game/view/hooks/useReadyState'

vi.mock('@/shared/ui/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() })
}))

vi.mock('@/game/services/WebSocketClient', () => ({
  webSocketClient: { setReady: vi.fn().mockResolvedValue(undefined) }
}))

const { webSocketClient } = await import('@/game/services/WebSocketClient')

const snapshot = (version: number, currentUserReady: boolean): GameState => ({
  gameId: 5,
  status: 'waiting',
  phase: null,
  currentSeat: null,
  turnNumber: 0,
  version,
  board: { cells: [] },
  players: [{ userId: 1, username: 'player', isReady: currentUserReady, isConnected: true }],
  currentUserReady,
  isCurrentPlayer: false,
  totalPlayers: 2
})

describe('useReadyState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useGameStore.getState().resetGame()
    useGameStore.getState().setGameId('5')
    useGameStore.getState().setGameState(snapshot(1, false))
    useAppStore.setState({ username: 'player' })
  })

  it('reconciles optimistic readiness when a newer roster snapshot resets it', async () => {
    const { result } = renderHook(() => useReadyState())

    await act(async () => result.current.handleReadyToggle())
    expect(result.current.isReady).toBe(true)

    act(() => useGameStore.getState().setGameState(snapshot(2, false)))
    await waitFor(() => expect(result.current.isReady).toBe(false))
    expect(result.current.isDisabled).toBe(false)

    await act(async () => result.current.handleReadyToggle())
    expect(webSocketClient.setReady).toHaveBeenNthCalledWith(2, '5', true)
  })
})

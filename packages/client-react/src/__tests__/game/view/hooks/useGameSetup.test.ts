import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useGameSetup } from '@/game/view/hooks/useGameSetup'
import { useGameStore } from '@/game/model/gameStore'
import { gameApi } from '@/game/services/gameApi'
import { ErrorType, GameError } from '@/shared/utils/errorHandler'

const connection = vi.hoisted(() => ({ isConnected: true }))

vi.mock('@/game/view/hooks/useGameConnection', () => ({
  useGameConnection: () => ({ isConnected: connection.isConnected, connectionId: useGameStore.getState().connectionId }),
}))

vi.mock('@/game/services/gameApi', () => ({
  gameApi: {
    getGame: vi.fn(async () => ({
      gameId: 5,
      status: 'waiting',
      phase: null,
      maxPlayers: 2,
      currentSeat: null,
      turnNumber: 0,
      version: 1,
      board: { cells: [] },
      players: [],
      winnerUserId: null,
      winReason: null,
      viewer: { role: 'spectator' },
    })),
  },
}))

vi.mock('@/game/services/WebSocketClient', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/game/services/WebSocketClient')>(),
  webSocketClient: {
    joinGame: vi.fn(),
    subscribeToGame: vi.fn(),
    retryConnection: vi.fn(),
    resetReconnectBackoff: vi.fn(),
  },
}))

const { webSocketClient } = await import('@/game/services/WebSocketClient')

describe('useGameSetup', () => {
  beforeEach(() => {
    connection.isConnected = true
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('joins and subscribes once the socket is connected', async () => {
    const { result } = renderHook(() => useGameSetup('5'))

    await waitFor(() => expect(result.current.isReady).toBe(true))

    expect(webSocketClient.joinGame).toHaveBeenCalledTimes(1)
    expect(webSocketClient.subscribeToGame).toHaveBeenCalledTimes(1)
    expect(webSocketClient.resetReconnectBackoff).toHaveBeenCalledOnce()
  })

  it('joins and subscribes again on the socket that replaces a dropped one', async () => {
    const { result, rerender } = renderHook(() => useGameSetup('5'))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    connection.isConnected = false
    act(() => rerender())
    expect(result.current.isReady).toBe(false)
    useGameStore.getState().setConnectionStatus('connected')
    connection.isConnected = true
    act(() => rerender())

    await waitFor(() => expect(webSocketClient.subscribeToGame).toHaveBeenCalledTimes(2))
    expect(webSocketClient.joinGame).toHaveBeenCalledTimes(2)
  })

  it('subscribes on a fresh page even if the HTTP game snapshot stalls', async () => {
    vi.mocked(gameApi.getGame).mockImplementationOnce(() => new Promise(() => {}))
    const { result } = renderHook(() => useGameSetup('5'))

    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(webSocketClient.subscribeToGame).toHaveBeenCalledWith('5')
  })

  it('retries a transient subscription failure and waits for the new subscription', async () => {
    vi.mocked(webSocketClient.subscribeToGame).mockRejectedValueOnce(
      new GameError(ErrorType.WEBSOCKET, 'Try again', 'internal'),
    )
    const { result, rerender } = renderHook(() => useGameSetup('5'))

    await waitFor(() => expect(webSocketClient.retryConnection).toHaveBeenCalledOnce())
    expect(result.current.isReady).toBe(false)
    expect(result.current.error).toBeNull()
    expect(webSocketClient.resetReconnectBackoff).not.toHaveBeenCalled()
    connection.isConnected = false
    act(() => rerender())
    useGameStore.getState().setConnectionStatus('connected')
    connection.isConnected = true
    act(() => rerender())

    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(webSocketClient.subscribeToGame).toHaveBeenCalledTimes(2)
    expect(webSocketClient.resetReconnectBackoff).toHaveBeenCalledOnce()
  })

  it('shows why the game could not be joined and does not subscribe', async () => {
    vi.mocked(webSocketClient.joinGame).mockRejectedValueOnce(new Error('Game is full'))

    const { result } = renderHook(() => useGameSetup('5'))

    await waitFor(() => expect(result.current.error).toBe('Game is full'))
    expect(result.current.isReady).toBe(false)
    expect(webSocketClient.subscribeToGame).not.toHaveBeenCalled()
    expect(webSocketClient.resetReconnectBackoff).not.toHaveBeenCalled()
  })

  it('does not reset backoff when an obsolete subscription finishes', async () => {
    let finishSubscription!: () => void
    vi.mocked(webSocketClient.subscribeToGame).mockImplementationOnce(() => new Promise((resolve) => {
      finishSubscription = () => resolve({ gameId: 5 })
    }))
    const { result, rerender } = renderHook(() => useGameSetup('5'))
    await waitFor(() => expect(webSocketClient.subscribeToGame).toHaveBeenCalledOnce())
    expect(webSocketClient.resetReconnectBackoff).not.toHaveBeenCalled()

    connection.isConnected = false
    act(() => rerender())
    useGameStore.getState().setConnectionStatus('connected')
    connection.isConnected = true
    act(() => rerender())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(webSocketClient.resetReconnectBackoff).toHaveBeenCalledOnce()

    await act(async () => finishSubscription())
    expect(webSocketClient.resetReconnectBackoff).toHaveBeenCalledOnce()
  })
})

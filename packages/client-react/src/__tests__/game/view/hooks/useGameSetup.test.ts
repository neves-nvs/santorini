import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useGameSetup } from '@/game/view/hooks/useGameSetup'

const connection = vi.hoisted(() => ({ isConnected: true }))

vi.mock('@/game/view/hooks/useGameConnection', () => ({
  useGameConnection: () => ({ isConnected: connection.isConnected, isConnecting: false }),
}))

vi.mock('@/game/services/gameApi', () => ({
  gameApi: { getGame: vi.fn(async () => ({ gameId: 5 })) },
}))

vi.mock('@/game/services/WebSocketClient', () => ({
  webSocketClient: {
    joinGame: vi.fn(),
    subscribeToGame: vi.fn(),
    unsubscribeFromGame: vi.fn(),
    request: vi.fn(),
    setReady: vi.fn(),
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
  })

  it('joins and subscribes again on the socket that replaces a dropped one', async () => {
    const { result, rerender } = renderHook(() => useGameSetup('5'))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    connection.isConnected = false
    act(() => rerender())
    connection.isConnected = true
    act(() => rerender())

    await waitFor(() => expect(webSocketClient.subscribeToGame).toHaveBeenCalledTimes(2))
    expect(webSocketClient.joinGame).toHaveBeenCalledTimes(2)
  })

  it('shows why the game could not be joined and does not subscribe', async () => {
    vi.mocked(webSocketClient.joinGame).mockRejectedValueOnce(new Error('Game is full'))

    const { result } = renderHook(() => useGameSetup('5'))

    await waitFor(() => expect(result.current.error).toBe('Game is full'))
    expect(result.current.isReady).toBe(false)
    expect(webSocketClient.subscribeToGame).not.toHaveBeenCalled()
  })
})

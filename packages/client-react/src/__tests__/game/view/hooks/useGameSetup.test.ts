import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useGameSetup } from '@/game/view/hooks/useGameSetup'

const connection = vi.hoisted(() => ({ isConnected: true }))

vi.mock('@/game/view/hooks/useGameConnection', () => ({
  useGameConnection: () => ({ isConnected: connection.isConnected, isConnecting: false }),
}))

vi.mock('@/shared/services/request', () => ({
  apiService: { getGame: vi.fn(async () => ({ gameId: 5 })) },
}))

vi.mock('@/game/services/WebSocketClient', () => ({
  webSocketClient: {
    joinGame: vi.fn(),
    subscribeToGame: vi.fn(),
    unsubscribeFromGame: vi.fn(),
    send: vi.fn(),
    makeMove: vi.fn(),
    setReady: vi.fn(),
  },
}))

const { webSocketClient } = await import('@/game/services/WebSocketClient')

describe('useGameSetup', () => {
  beforeEach(() => {
    connection.isConnected = true
    vi.clearAllMocks()
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
})

import { useEffect, useState } from 'react'
import { useGameStore } from '@/game/model/gameStore'
import { ConnectionInterruptedError, webSocketClient } from '@/game/services/WebSocketClient'
import { GameError } from '@/shared/utils/errorHandler'
import { useGameConnection } from './useGameConnection'

interface GameSetupResult {
  gameId: string
  connectionId: number
  error: string | null
}

export function useGameSetup(gameId?: string) {
  const { isConnected, connectionId } = useGameConnection()
  const setGameId = useGameStore((state) => state.setGameId)
  const resetGame = useGameStore((state) => state.resetGame)
  const [result, setResult] = useState<GameSetupResult | null>(null)

  useEffect(() => {
    resetGame()
    if (gameId) setGameId(gameId)
  }, [gameId, resetGame, setGameId])

  useEffect(() => {
    if (!gameId || !isConnected) return

    let cancelled = false
    const isCurrent = () => !cancelled && useGameStore.getState().connectionId === connectionId

    async function subscribe(id: string) {
      try {
        await webSocketClient.joinGame(id)
        if (!isCurrent()) return
        // The subscription sends a full snapshot before its acknowledgment.
        await webSocketClient.subscribeToGame(id)
        if (isCurrent()) setResult({ gameId: id, connectionId, error: null })
      } catch (error) {
        if (!isCurrent()) return
        if (error instanceof ConnectionInterruptedError) return
        if (error instanceof GameError && (error.code === 'internal' || error.code === 'rate_limited')) {
          webSocketClient.retryConnection()
          return
        }
        const message = error instanceof Error ? error.message : 'Failed to load game'
        setResult({ gameId: id, connectionId, error: message })
      }
    }

    void subscribe(gameId)
    return () => { cancelled = true }
  }, [gameId, isConnected, connectionId])

  const current = isConnected && result?.connectionId === connectionId && result.gameId === gameId ? result : null
  return { isReady: current !== null && current.error === null, error: current?.error ?? null }
}

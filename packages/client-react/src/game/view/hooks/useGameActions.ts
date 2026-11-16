/**
 * useGameActions - Clean action hook for game operations
 * 
 * Encapsulates all write operations:
 * - joinGame (via API)
 * - subscribeToGame (via WebSocket)
 * - setReady
 * 
 * Components call these actions; this hook handles service coordination.
 */

import { useCallback, useRef } from 'react'
import { gameApi } from '@/game/services/gameApi'
import { webSocketClient } from '@/game/services/WebSocketClient'
import { applyGameView } from '@/game/update/GameMessageHandler'

export function useGameActions() {
  // Track join/subscribe state to prevent duplicates
  const joinedGamesRef = useRef<Set<string>>(new Set())
  const subscribedGamesRef = useRef<Set<string>>(new Set())

  /**
   * Join a game via WebSocket
   * This registers the player in the game and auto-subscribes the WebSocket connection
   */
  const joinGame = useCallback(async (gameId: string): Promise<void> => {
    if (joinedGamesRef.current.has(gameId)) {
      console.log('Already joined game:', gameId)
      return
    }

    console.log('Joining game via WebSocket:', gameId)
    joinedGamesRef.current.add(gameId)
    try {
      await webSocketClient.joinGame(gameId)
    } catch (error) {
      joinedGamesRef.current.delete(gameId)
      throw error
    }
  }, [])

  /**
   * Subscribe to game updates via WebSocket
   */
  const subscribeToGame = useCallback(async (gameId: string): Promise<void> => {
    if (subscribedGamesRef.current.has(gameId)) {
      console.log('Already subscribed to game:', gameId)
      return
    }

    console.log('Subscribing to game:', gameId)
    subscribedGamesRef.current.add(gameId)
    try {
      await webSocketClient.subscribeToGame(gameId)
    } catch (error) {
      subscribedGamesRef.current.delete(gameId)
      throw error
    }
  }, [])

  /**
   * Unsubscribe from game updates
   */
  const unsubscribeFromGame = useCallback((gameId: string): void => {
    if (!subscribedGamesRef.current.has(gameId)) {
      return
    }

    console.log('Unsubscribing from game:', gameId)
    webSocketClient.unsubscribeFromGame(gameId)
    subscribedGamesRef.current.delete(gameId)
  }, [])

  /**
   * Fetch game state via REST API
   */
  const fetchGameState = useCallback(async (gameId: string): Promise<void> => {
    try {
      applyGameView(await gameApi.getGame(gameId))
    } catch (error) {
      console.error('Failed to fetch game state:', error)
      throw error
    }
  }, [])

  /**
   * Set player ready status
   */
  const setReady = useCallback(async (gameId: string, isReady: boolean): Promise<void> => {
    console.log(`Setting ready status for game ${gameId}: ${isReady}`)
    await webSocketClient.setReady(gameId, isReady)
  }, [])

  /**
   * Reset action state (call on game change/disconnect)
   */
  const resetActionState = useCallback((gameId?: string): void => {
    if (gameId) {
      joinedGamesRef.current.delete(gameId)
      subscribedGamesRef.current.delete(gameId)
    } else {
      joinedGamesRef.current.clear()
      subscribedGamesRef.current.clear()
    }
  }, [])

  return {
    joinGame,
    subscribeToGame,
    unsubscribeFromGame,
    fetchGameState,
    setReady,
    resetActionState
  }
}


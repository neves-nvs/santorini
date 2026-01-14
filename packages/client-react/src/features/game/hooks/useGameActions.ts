/**
 * useGameActions - Clean action hook for game operations
 * 
 * Encapsulates all write operations:
 * - joinGame (via API)
 * - subscribeToGame (via WebSocket)
 * - setReady
 * - makeMove
 * 
 * Components call these actions; this hook handles service coordination.
 */

import { useCallback, useRef } from 'react'
import { apiService } from '../../../services/ApiService'
import { webSocketClient } from '../services/WebSocketClient'
import { WS_MESSAGE_TYPES } from '@santorini/shared'
import { useSetGameState } from '../store/gameSelectors'
import type { Move } from '../types/game'

export function useGameActions() {
  const setGameState = useSetGameState()
  
  // Track join/subscribe state to prevent duplicates
  const joinedGamesRef = useRef<Set<string>>(new Set())
  const subscribedGamesRef = useRef<Set<string>>(new Set())

  /**
   * Join a game via WebSocket
   * This registers the player in the game and auto-subscribes the WebSocket connection
   */
  const joinGame = useCallback((gameId: string): void => {
    if (joinedGamesRef.current.has(gameId)) {
      console.log('✅ Already joined game:', gameId)
      return
    }

    console.log('🎮 Joining game via WebSocket:', gameId)
    webSocketClient.joinGame(gameId)
    joinedGamesRef.current.add(gameId)
  }, [])

  /**
   * Subscribe to game updates via WebSocket
   */
  const subscribeToGame = useCallback((gameId: string): void => {
    if (subscribedGamesRef.current.has(gameId)) {
      console.log('✅ Already subscribed to game:', gameId)
      return
    }

    console.log('📡 Subscribing to game:', gameId)
    webSocketClient.subscribeToGame(gameId)
    subscribedGamesRef.current.add(gameId)
  }, [])

  /**
   * Unsubscribe from game updates
   */
  const unsubscribeFromGame = useCallback((gameId: string): void => {
    if (!subscribedGamesRef.current.has(gameId)) {
      return
    }

    console.log('📡 Unsubscribing from game:', gameId)
    webSocketClient.unsubscribeFromGame(gameId)
    subscribedGamesRef.current.delete(gameId)
  }, [])

  /**
   * Fetch game state via REST API
   */
  const fetchGameState = useCallback(async (gameId: string): Promise<void> => {
    try {
      console.log('🔍 Fetching game state:', gameId)
      const state = await apiService.getGameState(gameId)
      setGameState(state)
    } catch (error) {
      console.error('❌ Failed to fetch game state:', error)
      throw error
    }
  }, [setGameState])

  /**
   * Set player ready status
   */
  const setReady = useCallback((gameId: string, isReady: boolean): void => {
    console.log(`🎯 Setting ready status for game ${gameId}: ${isReady}`)
    webSocketClient.send(WS_MESSAGE_TYPES.SET_READY, {
      gameId: parseInt(gameId),
      isReady
    })
  }, [])

  /**
   * Make a game move
   */
  const makeMove = useCallback((moveType: string, data: Move | { workerId: number; position: { x: number; y: number } }): void => {
    console.log('🎮 Making move:', moveType, data)
    webSocketClient.makeMove(moveType, data)
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
    makeMove,
    resetActionState
  }
}


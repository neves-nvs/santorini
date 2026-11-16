/**
 * useGameSetup - Coordinates game page initialization
 * 
 * This hook orchestrates:
 * 1. WebSocket connection (via useGameConnection)
 * 2. Game state fetching
 * 3. Game joining
 * 4. Game subscription
 * 
 * Components just call useGameSetup(gameId) and get loading/error states.
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useGameConnection } from './useGameConnection'
import { useGameActions } from './useGameActions'
import { useAppStore } from '@/user/model/appStore'
import { useSetGameId, useSetGameState } from '@/game/model/gameSelectors'
import { logError } from '@/shared/utils/log'

interface GameSetupResult {
  isLoading: boolean
  error: string | null
  isConnected: boolean
  isReady: boolean // True when game state is loaded and subscribed
}

export function useGameSetup(gameId?: string): GameSetupResult {
  const appError = useAppStore((s) => s.error)
  const setError = useAppStore((s) => s.setError)
  const { isConnected, isConnecting } = useGameConnection()
  const { joinGame, subscribeToGame, fetchGameState, resetActionState } = useGameActions()
  const setGameId = useSetGameId()
  const setGameState = useSetGameState()

  const [isLoading, setIsLoading] = useState(true)
  const [localError, setLocalError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Refs to track initialization state
  const prevGameIdRef = useRef<string | null>(null)
  const initializingRef = useRef(false)

  // Reset state when gameId changes
  useEffect(() => {
    if (!gameId) return

    if (prevGameIdRef.current !== gameId) {
      prevGameIdRef.current = gameId

      // Clear state for new game
      setIsLoading(true)
      setIsReady(false)
      setLocalError(null)
      initializingRef.current = false
      setGameState(null)
      resetActionState(prevGameIdRef.current || undefined)
    }

    setGameId(gameId)
  }, [gameId, setGameId, setGameState, resetActionState])

  // The server forgets a dropped socket, so the socket that replaces it has to join and subscribe again
  useEffect(() => {
    if (!gameId || isConnected) return

    resetActionState(gameId)
    initializingRef.current = false
  }, [gameId, isConnected, resetActionState])

  // Initialize game when connected
  const initializeGame = useCallback(async () => {
    if (!gameId || !isConnected || initializingRef.current) return

    initializingRef.current = true

    try {
      // 1. Fetch game state first to check if already in game
      await fetchGameState(gameId)

      // 2. Join game via WebSocket (registers connection and adds player)
      // This auto-subscribes the WebSocket connection for broadcasts
      joinGame(gameId)

      // 3. Subscribe to get initial state update
      subscribeToGame(gameId)

      setIsLoading(false)
      setIsReady(true)
    } catch (error) {
      logError('Game initialization failed:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to initialize game'
      setLocalError(errorMsg)
      setError(errorMsg)
      setIsLoading(false)
      initializingRef.current = false
    }
  }, [gameId, isConnected, fetchGameState, joinGame, subscribeToGame, setError])

  // Trigger initialization when connected
  useEffect(() => {
    if (gameId && isConnected && !initializingRef.current) {
      initializeGame()
    }
  }, [gameId, isConnected, initializeGame])

  return {
    isLoading: isLoading || isConnecting,
    error: localError || appError,
    isConnected,
    isReady
  }
}


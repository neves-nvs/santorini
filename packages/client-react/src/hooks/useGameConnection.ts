import { useEffect, useState, useRef, useCallback } from 'react'
import { useApp } from '../store/AppContext'
import {
  useIsConnected,
  useIsConnecting,
  useSetGameId,
  useSetGameState,
  useGameState
} from '../store/gameSelectors'
import { webSocketService } from '../services/WebSocketService'
import { apiService } from '../services/ApiService'

/**
 * Custom hook to manage game connection lifecycle
 * Handles: WebSocket connection, game joining, subscription, and cleanup
 */
export const useGameConnection = (gameId?: string) => {
  const { state: appState, setError } = useApp()
  const isConnected = useIsConnected()
  const isConnecting = useIsConnecting()
  const setGameId = useSetGameId()
  const setGameState = useSetGameState()
  const gameState = useGameState()

  // Local state to prevent loops
  const [isLoading, setIsLoading] = useState(false)
  const [hasSubscribed, setHasSubscribed] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)

  // Refs to prevent duplicate operations
  const prevGameIdRef = useRef<string | null>(null)
  const isFetchingRef = useRef(false)
  const subscriptionRef = useRef<string | null>(null)
  const joinAttemptRef = useRef<string | null>(null)

  // Stable WebSocket methods using useCallback to prevent effect re-runs
  const subscribeToGame = useCallback((gameId: string) => {
    if (subscriptionRef.current === gameId) {
      console.log('🔄 Already subscribed to game:', gameId)
      return
    }
    console.log('📡 Subscribing to game:', gameId)
    webSocketService.subscribeToGame(gameId)
    subscriptionRef.current = gameId
  }, [])

  const unsubscribeFromGame = useCallback((gameId: string) => {
    if (subscriptionRef.current !== gameId) {
      console.log('🔄 Not subscribed to game:', gameId)
      return
    }
    console.log('📡 Unsubscribing from game:', gameId)
    webSocketService.unsubscribeFromGame(gameId)
    subscriptionRef.current = null
  }, [])

  // Initialize game ID and fetch initial state (only when gameId changes)
  useEffect(() => {
    if (!gameId) return

    // Reset state for new game
    if (prevGameIdRef.current !== gameId) {
      console.log('🔄 Game ID changed from', prevGameIdRef.current, 'to', gameId)
      setHasSubscribed(false)
      setHasJoined(false)
      subscriptionRef.current = null
      joinAttemptRef.current = null

      // CRITICAL: Clear stale game state when switching games
      setGameState(null)
      console.log('🧹 Cleared stale game state for new game')

      prevGameIdRef.current = gameId
    }

    setGameId(gameId)

    // Fetch initial game state only once per game
    const fetchGameState = async () => {
      if (isFetchingRef.current) {
        console.log('🔄 Already fetching game state, skipping')
        return
      }

      isFetchingRef.current = true
      setIsLoading(true)
      setError(null)

      try {
        console.log('🔍 Fetching initial game state for game:', gameId)
        const fetchedGameState = await apiService.getGameState(gameId)
        setGameState(fetchedGameState)
        console.log('✅ Initial game state loaded:', fetchedGameState)
      } catch (error) {
        console.error('❌ Failed to load initial game state:', error)
        setError(error instanceof Error ? error.message : 'Failed to load game')
      } finally {
        setIsLoading(false)
        isFetchingRef.current = false
      }
    }

    fetchGameState()
  }, [gameId, setGameId, setGameState, setError])

  // Auto-connect WebSocket when component mounts (only once per username)
  useEffect(() => {
    if (appState.username && !isConnected && !isConnecting) {
      console.log('🔌 Initiating WebSocket connection for user:', appState.username)
      webSocketService.connectAfterAuth()
    } else if (appState.username && (isConnected || isConnecting)) {
      console.log('🔄 WebSocket already connected/connecting for user:', appState.username)
    } else {
      console.log('⚠️ No username available, skipping WebSocket connection')
    }
  }, [appState.username, isConnected, isConnecting])

  // Check if user is in game and join if not (prevent duplicate join attempts)
  useEffect(() => {
    const checkAndJoinGame = async () => {
      if (!gameId || !appState.username || !gameState || hasJoined) return

      // Prevent duplicate join attempts
      if (joinAttemptRef.current === gameId) {
        console.log('🔄 Already attempted to join game:', gameId)
        return
      }

      // Check if current user is already in the game
      const currentUser = appState.username
      const players = gameState.players || []
      const isUserInGame = players.some((player: any) =>
        player.username === currentUser || player.id === currentUser
      )

      console.log(`🔍 Join check for game ${gameId}: user=${currentUser}, gameState.id=${gameState.id}, players=${JSON.stringify(players)}, isUserInGame=${isUserInGame}`)

      // Extra safety: ensure we're checking the right game
      const gameIdMismatch = gameState.id && gameState.id !== gameId
      if (gameIdMismatch) {
        console.log(`⚠️ Game state mismatch: expected ${gameId}, got ${gameState.id}. Forcing join attempt.`)
      }

      // Force join if: user not in game, game ID mismatch, or no game state
      if (!isUserInGame || gameIdMismatch || !gameState.id) {
        console.log(`🎯 User ${currentUser} not in game ${gameId}, joining...`)
        joinAttemptRef.current = gameId

        try {
          const success = await apiService.joinGame(gameId)
          if (success) {
            console.log(`✅ Successfully joined game ${gameId}`)
            setHasJoined(true)
            // Don't fetch game state here - WebSocket will send updated state
            console.log(`🔄 Waiting for WebSocket to send updated game state after join`)
          } else {
            console.error(`❌ Failed to join game ${gameId}`)
            joinAttemptRef.current = null // Reset on failure
          }
        } catch (error) {
          console.error(`❌ Error joining game ${gameId}:`, error)
          joinAttemptRef.current = null // Reset on error
        }
      } else {
        console.log(`✅ User ${currentUser} already in game ${gameId}`)
        setHasJoined(true)
        joinAttemptRef.current = gameId
      }
    }

    checkAndJoinGame()
  }, [gameId, appState.username, gameState, hasJoined, setGameState])

  // Subscribe to game updates when ready (prevent duplicate subscriptions)
  useEffect(() => {
    console.log('🔧 useGameConnection subscription effect - gameId:', gameId, 'isConnected:', isConnected, 'isLoading:', isLoading, 'hasSubscribed:', hasSubscribed, 'hasJoined:', hasJoined)

    if (gameId && isConnected && !isLoading && !hasSubscribed && hasJoined) {
      console.log(`🎮 Subscribing to game: ${gameId}`)

      try {
        subscribeToGame(gameId)
        setHasSubscribed(true)
      } catch (error) {
        console.error('❌ Failed to subscribe to game:', error)
        setError(error instanceof Error ? error.message : 'Failed to subscribe to game')
      }
    } else if (gameId && !isConnected && !isLoading) {
      console.log('⏳ Waiting for WebSocket connection before subscribing to game:', gameId)
    } else if (gameId && isConnected && !hasJoined) {
      console.log('⏳ Waiting for game join before subscribing to game:', gameId)
    }
  }, [gameId, isConnected, isLoading, hasSubscribed, hasJoined, subscribeToGame, setError])

  // Fallback: Subscribe after a delay if join seems to be stuck
  useEffect(() => {
    if (gameId && isConnected && !hasSubscribed && !isLoading) {
      const fallbackTimer = setTimeout(() => {
        if (!hasSubscribed && isConnected) {
          console.log('🔄 Fallback: Force subscribing to game after delay:', gameId)
          try {
            subscribeToGame(gameId)
            setHasSubscribed(true)
          } catch (error) {
            console.error('❌ Fallback subscription failed:', error)
          }
        }
      }, 3000) // 3 second fallback

      return () => clearTimeout(fallbackTimer)
    }
  }, [gameId, isConnected, hasSubscribed, isLoading, subscribeToGame])

  // Cleanup on unmount or gameId change
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up subscription for game:', subscriptionRef.current)
        unsubscribeFromGame(subscriptionRef.current)
        subscriptionRef.current = null
      }
    }
  }, [unsubscribeFromGame])

  return {
    isLoading,
    isConnected,
    isConnecting,
    hasSubscribed,
    error: appState.error
  }
}

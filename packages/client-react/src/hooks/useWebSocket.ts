import { useEffect, useCallback, useMemo } from 'react'
import { webSocketService, WebSocketEventHandler } from '../services/WebSocketService'
import { useGame } from '../store/GameContext'
import { useToast } from '../store/ToastContext'
import { GameState, AvailablePlay } from '../types/game'

/**
 * Calculate isMyTurn based on current user and game state
 * Memoized to avoid recalculation on every render
 */
const calculateIsMyTurn = (gameState: any, currentUsername: string | null): any => {
  if (!gameState || !currentUsername) {
    return { ...gameState, isMyTurn: false }
  }

  // Find current user in players array
  const currentUser = gameState.players?.find((player: any) =>
    player.username === currentUsername
  )

  if (!currentUser) {
    return { ...gameState, isMyTurn: false }
  }

  // Compare current user ID with currentPlayer
  const isMyTurn = currentUser.id?.toString() === gameState.currentPlayer?.toString()

  // Calculate if it's current user's turn

  return { ...gameState, isMyTurn }
}

export const useWebSocket = () => {
  const {
    state,
    setConnected,
    setConnecting,
    setError,
    setGameState,
    setCurrentPlayerMoves,
    setMyTurn
  } = useGame()
  const { showToast } = useToast()

  // Memoize turn calculation to avoid expensive operations
  const calculateTurnMemoized = useCallback((gameState: any) => {
    return calculateIsMyTurn(gameState, state.username)
  }, [state.username])

  // Only set up event handlers, don't auto-connect

  // Handle connection status
  useEffect(() => {
    const handleConnected: WebSocketEventHandler = () => {
      setConnected(true)
      setError(null)
    }

    const handleDisconnected: WebSocketEventHandler = () => {
      setConnected(false)
      setConnecting(false) // Also reset connecting state
    }

    const handleError: WebSocketEventHandler = (message) => {
      setError(message.payload.error || 'WebSocket error')
      setConnected(false)
      setConnecting(false) // Also reset connecting state on error
    }

    const handleMaxReconnectAttempts: WebSocketEventHandler = (message) => {
      setError(message.payload.error || 'Failed to connect to server')
      setConnected(false)
      setConnecting(false) // Also reset connecting state when max attempts reached
    }

    // Register event handlers
    webSocketService.on('connected', handleConnected)
    webSocketService.on('disconnected', handleDisconnected)
    webSocketService.on('error', handleError)
    webSocketService.on('maxReconnectAttemptsReached', handleMaxReconnectAttempts)

    // Cleanup
    return () => {
      webSocketService.off('connected', handleConnected)
      webSocketService.off('disconnected', handleDisconnected)
      webSocketService.off('error', handleError)
      webSocketService.off('maxReconnectAttemptsReached', handleMaxReconnectAttempts)
    }
  }, [setConnected, setError])

  // Handle game-specific messages
  useEffect(() => {
    const handleJoinedGame: WebSocketEventHandler = (message) => {
      console.log('Joined game:', message.payload)
      if (message.payload.gameState) {
        const gameStateWithTurn = calculateTurnMemoized(message.payload.gameState)
        setGameState(gameStateWithTurn)
      }
    }

    const handleCurrentPlayers: WebSocketEventHandler = (message) => {
      console.log('Current players:', message.payload)
      // Update players in game state if needed
    }

    const handlePlayersInGame: WebSocketEventHandler = (message) => {
      console.log('👥 Players in game:', message.payload)
      console.log('Current game state before update:', state.gameState)
      // Update the game state with current players
      const currentGameState = state.gameState || {
        id: state.gameId || '',
        board: { spaces: [] },
        currentPlayer: '',
        phase: 'SETUP' as const,
        winner: undefined
      }
      const newGameState = {
        ...currentGameState,
        players: message.payload
      }
      console.log('Updated game state:', newGameState)
      const gameStateWithTurn = calculateTurnMemoized(newGameState)
      setGameState(gameStateWithTurn)
    }

    // Note: available_plays/available_moves are handled directly by GameplayService
    // No need to handle them here to avoid duplicate processing

    const handleGameStateUpdate: WebSocketEventHandler = (message) => {
      // Game state update received
      console.log('🔄 Received game state update for game:', message.payload?.id, 'current game:', state.gameId)

      // Only process updates for the current game
      if (message.payload?.id && state.gameId && message.payload.id.toString() !== state.gameId.toString()) {
        console.log('⚠️ Ignoring game state update for different game:', message.payload.id, 'vs current:', state.gameId)
        return
      }

      // Game state update should include players - use it immediately
      // Calculate isMyTurn based on current user
      const gameStateWithTurn = calculateIsMyTurn(message.payload, state.username)
      setGameState(gameStateWithTurn)

      // Log important state changes
      if (message.payload?.game_status === 'ready') {
        console.log('🟡 Game is now READY for player confirmations!')
      }
      if (message.payload?.game_status === 'in-progress') {
        console.log('🟢 Game has started!')
      }

      // If this game state includes players, we don't need to wait for separate players_in_game message
      if (message.payload?.players) {
        // Players included in game state
      }
    }

    const handleGameStart: WebSocketEventHandler = (message) => {
      console.log('🚀 Game Started! All players are ready.', message.payload)

      // Show toast notification
      showToast('🚀 Game Started! All players are ready. Let the battle begin!', 'success', 6000)

      // Also try browser notification if available
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Santorini Game Started!', {
            body: 'All players are ready. The game has begun!',
            icon: '/favicon.ico'
          })
        }
      }
    }

    const handleGameReadyForStart: WebSocketEventHandler = (message) => {
      console.log('🎯 Game ready for start!', message.payload)

      // Show toast notification that game is ready for confirmation
      showToast('🎯 Game is full! Click "Ready" to start the game.', 'info', 5000)
    }

    const handlePlayerReadyStatus: WebSocketEventHandler = (message) => {
      console.log('Player ready status update:', message.payload)
      // Update the game state with the new ready status
      if (state.gameState) {
        const newGameState = {
          ...state.gameState,
          playersReadyStatus: message.payload
        }
        const gameStateWithTurn = calculateTurnMemoized(newGameState)
        setGameState(gameStateWithTurn)
      }
    }

    const handlePlayerReadyUpdated: WebSocketEventHandler = (message) => {
      console.log('🎯 Player ready status updated:', message.payload)
      // Update the current user's ready status and all players' ready status
      if (state.gameState) {
        const newGameState = {
          ...state.gameState,
          currentUserReady: message.payload.isReady,
          playersReadyStatus: message.payload.playersReadyStatus
        }
        const gameStateWithTurn = calculateTurnMemoized(newGameState)
        setGameState(gameStateWithTurn)
      }
    }

    const handleGameStarted: WebSocketEventHandler = (message) => {
      console.log('🚀 Game has started!', message.payload)
      // Update game state to reflect that the game has started
      const gameStateWithTurn = calculateIsMyTurn(message.payload, state.username)
      setGameState(gameStateWithTurn)
    }

    const handleGameStartingCountdown: WebSocketEventHandler = (message) => {
      console.log('⏰ Game starting countdown:', message.payload)
      // Handle countdown display - this could trigger UI updates
    }

    // Register game event handlers
    webSocketService.on('joined_game', handleJoinedGame)
    webSocketService.on('current_players', handleCurrentPlayers)
    webSocketService.on('players_in_game', handlePlayersInGame)
    // Note: available_plays/available_moves are handled directly by GameplayService
    webSocketService.on('game_state_update', handleGameStateUpdate)
    webSocketService.on('game_start', handleGameStart)
    webSocketService.on('game_ready_for_start', handleGameReadyForStart)
    webSocketService.on('player_ready_status', handlePlayerReadyStatus)
    webSocketService.on('player_ready_updated', handlePlayerReadyUpdated)
    webSocketService.on('game_started', handleGameStarted)
    webSocketService.on('game_starting_countdown', handleGameStartingCountdown)

    // Cleanup
    return () => {
      webSocketService.off('joined_game', handleJoinedGame)
      webSocketService.off('current_players', handleCurrentPlayers)
      webSocketService.off('players_in_game', handlePlayersInGame)
      // Note: available_plays/available_moves cleanup handled by GameplayService
      webSocketService.off('game_state_update', handleGameStateUpdate)
      webSocketService.off('game_start', handleGameStart)
      webSocketService.off('game_ready_for_start', handleGameReadyForStart)
      webSocketService.off('player_ready_status', handlePlayerReadyStatus)
      webSocketService.off('player_ready_updated', handlePlayerReadyUpdated)
      webSocketService.off('game_started', handleGameStarted)
      webSocketService.off('game_starting_countdown', handleGameStartingCountdown)
    }
  }, [setGameState, setCurrentPlayerMoves, setMyTurn, calculateTurnMemoized])

  // Game actions (backend extracts username from JWT token)
  const subscribeToGame = useCallback((gameId: string) => {
    // Subscribe to game updates
    webSocketService.subscribeToGame(gameId)
  }, [])

  const unsubscribeFromGame = useCallback((gameId: string) => {
    // Unsubscribe from game updates
    webSocketService.unsubscribeFromGame(gameId)
  }, [])

  const joinGame = useCallback((gameId: string) => {
    // Join game via WebSocket
    webSocketService.joinGame(gameId)
  }, [])

  const placeWorker = useCallback((x: number, y: number) => {
    webSocketService.placeWorker(x, y)
  }, [])

  const moveWorker = useCallback((from: { x: number, y: number }, to: { x: number, y: number }) => {
    webSocketService.moveWorker(from, to)
  }, [])

  const buildBlock = useCallback((x: number, y: number, blockType?: string) => {
    webSocketService.buildBlock(x, y, blockType)
  }, [])

  // Connection management
  const connect = useCallback(() => {
    setConnecting(true)
    webSocketService.connectAfterAuth()
  }, [setConnecting])

  const disconnect = useCallback(() => {
    webSocketService.disconnect()
    setConnected(false)
  }, [setConnected])

  return {
    isConnected: state.isConnected,
    error: state.error,
    connect,
    disconnect,
    subscribeToGame,
    unsubscribeFromGame,
    joinGame,
    placeWorker,
    moveWorker,
    buildBlock,
    // Direct access to service for custom messages
    sendMessage: webSocketService.send.bind(webSocketService)
  }
}

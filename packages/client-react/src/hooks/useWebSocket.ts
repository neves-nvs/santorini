import { useEffect, useCallback } from 'react'
import { webSocketService, WebSocketEventHandler } from '../services/WebSocketService'
import { useGame } from '../store/GameContext'
import { GameState, AvailablePlay } from '../types/game'
import { gameplayService } from '../services/GameplayService'

export const useWebSocket = () => {
  const {
    state,
    setConnected,
    setConnecting,
    setError,
    setGameState,
    setAvailablePlays
  } = useGame()

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
        setGameState(message.payload.gameState)
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
      setGameState(newGameState)
    }

    const handleAvailablePlays: WebSocketEventHandler = (message) => {
      console.log('🎯 Available plays received in useWebSocket:', message.payload)

      // Set the old availablePlays state for backward compatibility
      if (Array.isArray(message.payload)) {
        setAvailablePlays(message.payload)
      } else if (message.payload.plays) {
        setAvailablePlays(message.payload.plays)
      }

      // IMPORTANT: Also route to GameplayService for new turn logic
      console.log('🎯 Routing available_plays to GameplayService from useWebSocket')
      gameplayService.handleMessage(message)
    }

    const handleGameStateUpdate: WebSocketEventHandler = (message) => {
      console.log('🎮 Game state update received:', {
        game_status: message.payload?.game_status,
        players_count: message.payload?.players?.length,
        ready_status_count: message.payload?.playersReadyStatus?.length,
        payload: message.payload
      })

      // Game state update should include players - use it immediately
      setGameState(message.payload)

      // Log important state changes
      if (message.payload?.game_status === 'ready') {
        console.log('🟡 Game is now READY for player confirmations!')
      }
      if (message.payload?.game_status === 'in-progress') {
        console.log('🟢 Game has started!')
      }

      // If this game state includes players, we don't need to wait for separate players_in_game message
      if (message.payload?.players) {
        console.log('✅ Players included in game state:', message.payload.players)
      }
    }

    const handleGameStart: WebSocketEventHandler = (message) => {
      console.log('🎮 Game started!', message.payload)
      // Game has started, players can now make moves
      // You could show a notification or update UI here
    }

    const handleGameReadyForStart: WebSocketEventHandler = (message) => {
      console.log('Game ready for start!', message.payload)
      // Game is full and ready for player confirmation
      // The game state will be updated via the game_state_update message that follows
    }

    const handlePlayerReadyStatus: WebSocketEventHandler = (message) => {
      console.log('Player ready status update:', message.payload)
      // Update the game state with the new ready status
      if (state.gameState) {
        setGameState({
          ...state.gameState,
          playersReadyStatus: message.payload
        })
      }
    }

    const handlePlayerReadyUpdated: WebSocketEventHandler = (message) => {
      console.log('🎯 Player ready status updated:', message.payload)
      // Update the current user's ready status and all players' ready status
      if (state.gameState) {
        setGameState({
          ...state.gameState,
          currentUserReady: message.payload.isReady,
          playersReadyStatus: message.payload.playersReadyStatus
        })
      }
    }

    const handleGameStarted: WebSocketEventHandler = (message) => {
      console.log('🚀 Game has started!', message.payload)
      // Update game state to reflect that the game has started
      setGameState(message.payload)
    }

    const handleGameStartingCountdown: WebSocketEventHandler = (message) => {
      console.log('⏰ Game starting countdown:', message.payload)
      // Handle countdown display - this could trigger UI updates
    }

    // Register game event handlers
    webSocketService.on('joined_game', handleJoinedGame)
    webSocketService.on('current_players', handleCurrentPlayers)
    webSocketService.on('players_in_game', handlePlayersInGame)
    webSocketService.on('available_plays', handleAvailablePlays)
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
      webSocketService.off('available_plays', handleAvailablePlays)
      webSocketService.off('game_state_update', handleGameStateUpdate)
      webSocketService.off('game_start', handleGameStart)
      webSocketService.off('game_ready_for_start', handleGameReadyForStart)
      webSocketService.off('player_ready_status', handlePlayerReadyStatus)
      webSocketService.off('player_ready_updated', handlePlayerReadyUpdated)
      webSocketService.off('game_started', handleGameStarted)
      webSocketService.off('game_starting_countdown', handleGameStartingCountdown)
    }
  }, [setGameState, setAvailablePlays])

  // Game actions
  const subscribeToGame = useCallback((gameId: string, username: string) => {
    console.log('🎮 Subscribing to game:', gameId, 'as user:', username)
    webSocketService.subscribeToGame(gameId, username)
  }, [])

  const joinGame = useCallback((gameId: string, username: string) => {
    console.log('🎮 Joining game via WebSocket:', gameId, 'as user:', username)
    webSocketService.joinGame(gameId, username)
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
    joinGame,
    placeWorker,
    moveWorker,
    buildBlock,
    // Direct access to service for custom messages
    sendMessage: webSocketService.send.bind(webSocketService)
  }
}

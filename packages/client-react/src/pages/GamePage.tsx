import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { useWebSocket } from '../hooks/useWebSocket'
import { apiService } from '../services/ApiService'
import GameUI from '../components/ui/GameUI'

const GamePage = () => {
  const { gameId } = useParams<{ gameId?: string }>()
  const { state, setGameId, setGameState, setError } = useGame()
  const { subscribeToGame, unsubscribeFromGame, isConnected } = useWebSocket()
  const [isLoading, setIsLoading] = useState(false)
  const [hasSubscribed, setHasSubscribed] = useState(false)

  // Fetch initial game state when gameId changes
  useEffect(() => {
    if (gameId && gameId !== state.gameId) {
      setGameId(gameId)
      setHasSubscribed(false) // Reset subscription flag for new game

      const fetchGameState = async () => {
        setIsLoading(true)
        setError(null)

        try {
          console.log('🔄 Fetching initial game state for game:', gameId)
          const gameState = await apiService.getGameState(gameId)
          console.log('✅ Initial game state loaded:', gameState)
          setGameState(gameState)
        } catch (error) {
          console.error('❌ Failed to fetch game state:', error)
          setError(error instanceof Error ? error.message : 'Failed to load game')
        } finally {
          setIsLoading(false)
        }
      }

      fetchGameState()
    }
  }, [gameId, state.gameId, setGameId, setGameState, setError])

  // Track the previous gameId to handle unsubscription
  const prevGameIdRef = useRef<string | null>(null)

  // Subscribe to WebSocket updates once when both conditions are met
  useEffect(() => {
    if (gameId && isConnected && state.gameState && !isLoading && !hasSubscribed) {
      // Unsubscribe from previous game if switching games
      if (prevGameIdRef.current && prevGameIdRef.current !== gameId) {
        console.log('📡 Unsubscribing from previous game:', prevGameIdRef.current)
        unsubscribeFromGame(prevGameIdRef.current)
      }

      console.log('📡 Subscribing to WebSocket updates for game:', gameId)
      subscribeToGame(gameId)
      setHasSubscribed(true)
      prevGameIdRef.current = gameId
    }
  }, [gameId, isConnected, state.gameState, isLoading, hasSubscribed, subscribeToGame, unsubscribeFromGame])

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (prevGameIdRef.current) {
        console.log('📡 Component unmounting - unsubscribing from game:', prevGameIdRef.current)
        unsubscribeFromGame(prevGameIdRef.current)
      }
    }
  }, [])

  // Show loading state while fetching game data
  if (isLoading) {
    return (
      <div className="page">
        <div className="game-container" style={{
          background: 'linear-gradient(to bottom, #87CEEB, #E0F6FF)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center', color: '#333' }}>
            <h2>Loading Game {gameId}...</h2>
            <p>Fetching game state...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if game failed to load
  if (state.error) {
    return (
      <div className="page">
        <div className="game-container" style={{
          background: 'linear-gradient(to bottom, #87CEEB, #E0F6FF)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center', color: '#333' }}>
            <h2>Failed to Load Game</h2>
            <p>{state.error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="game-container" style={{
        background: 'linear-gradient(to bottom, #87CEEB, #E0F6FF)'
      }}>
        {/* UI Overlay - GameBoard is now handled inside GameUI */}
        <div className="ui-overlay">
          <GameUI />
        </div>
      </div>
    </div>
  )
}

export default GamePage

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { GameProvider } from './store/GameContext'
import { useEffect, useState } from 'react'
import { useGame } from './store/GameContext'
import { useWebSocket } from './hooks/useWebSocket'
import { apiService } from './services/ApiService'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import AuthPage from './pages/AuthPage'
import LobbyPage from './pages/LobbyPage'
import './App.css'

// Component to handle auto-connection after app loads
const AppInitializer = () => {
  const { state, setConnecting, setGameState, resetGame } = useGame()
  const { connect, subscribeToGame } = useWebSocket()

  // Prevent rapid-fire requests with a simple flag
  const [isInitializing, setIsInitializing] = useState(false)

  useEffect(() => {
    // Auto-connect WebSocket if user is logged in
    if (state.username && !state.isConnected && !state.isConnecting) {
      console.log('Auto-connecting WebSocket for user:', state.username)
      setConnecting(true)

      // Try to connect, but handle failures gracefully
      try {
        connect()
      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
        setConnecting(false)
      }

      // Set a timeout to show disconnected if connection takes too long
      const timeout = setTimeout(() => {
        if (!state.isConnected) {
          console.warn('WebSocket connection timeout - resetting connecting state')
          setConnecting(false)
        }
      }, 5000) // 5 second timeout

      return () => clearTimeout(timeout)
    }
  }, [state.username, state.isConnected, state.isConnecting, connect, setConnecting])

  // Handle page reload: Fetch HTTP first, then connect WebSocket
  useEffect(() => {
    if (state.gameId && state.username && !state.gameState && !state.isConnected && !isInitializing) {
      console.log('🔄 Page reload detected - fetching game state via HTTP first')
      setIsInitializing(true)

      const fetchThenConnect = async () => {
        try {
          // 1. Fetch current game state via HTTP
          const gameState = await apiService.getGameState(state.gameId!)
          console.log('✅ Initial game state loaded via HTTP:', gameState)
          setGameState(gameState)

          // 2. Now connect WebSocket for real-time updates
          console.log('📡 Connecting WebSocket for real-time updates')
          setConnecting(true)
          connect()
        } catch (error) {
          console.error('❌ Failed to fetch initial game state:', error)
          // If authentication failed, don't try to connect WebSocket
          if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
            console.warn('Authentication failed, not attempting WebSocket connection')
            setConnecting(false)
            return
          }
          // If game not found (404), clear the invalid game ID
          if (error instanceof Error && error.message.includes('404')) {
            console.warn('Game not found, clearing invalid game ID')
            resetGame()
            setConnecting(false)
            return
          }
          // For other errors, still try to connect WebSocket
          setConnecting(true)
          connect()
        }

        // Always reset initialization flag when done
        setIsInitializing(false)
      }

      fetchThenConnect()
    }
  }, [state.gameId, state.username, state.gameState, state.isConnected, isInitializing, setGameState, setConnecting, connect, resetGame, setIsInitializing])

  // Handle fresh login: Connect WebSocket immediately (no HTTP needed)
  useEffect(() => {
    if (state.username && !state.isConnected && !state.isConnecting && !state.gameId) {
      console.log('🚀 Fresh login - connecting WebSocket immediately')
      setConnecting(true)

      try {
        connect()
      } catch (error) {
        console.error('Failed to connect WebSocket on fresh login:', error)
        setConnecting(false)
      }
    }
  }, [state.username, state.isConnected, state.isConnecting, state.gameId, setConnecting, connect])

  // Subscribe to game updates once WebSocket is connected (for both reload and fresh login)
  useEffect(() => {
    if (state.isConnected && state.gameId && state.username) {
      console.log('📡 WebSocket connected - subscribing to game updates:', state.gameId)

      const timer = setTimeout(() => {
        subscribeToGame(state.gameId!, state.username!)
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [state.isConnected, state.gameId, state.username, subscribeToGame])

  return null
}

function App() {
  return (
    <GameProvider>
      <Router>
        <div className="app">
          <AppInitializer />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/lobby" element={<LobbyPage />} />
            <Route path="/game" element={<GamePage />} />
            <Route path="/game/:gameId" element={<GamePage />} />
          </Routes>
        </div>
      </Router>
    </GameProvider>
  )
}

export default App

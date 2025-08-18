import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { GameProvider } from './store/GameContext'
import { ToastProvider } from './store/ToastContext'
import { useEffect, useState } from 'react'
import { useGame } from './store/GameContext'
import { useWebSocket } from './hooks/useWebSocket'
import { apiService } from './services/ApiService'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import AuthPage from './pages/AuthPage'
import LobbyPage from './pages/LobbyPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import './App.css'

// Component to handle auto-connection after app loads
const AppInitializer = () => {
  const { state, setConnecting, setGameState, resetGame, setUsername } = useGame()
  const { connect } = useWebSocket()

  // Prevent rapid-fire requests with a simple flag
  const [isInitializing, setIsInitializing] = useState(false)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)

  // Check authentication status on app startup
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (hasCheckedAuth) return

      try {
        console.log('🔍 Checking authentication status...')
        const authInfo = await apiService.checkAuth()

        if (authInfo) {
          console.log('✅ User is authenticated:', authInfo.username)
          setUsername(authInfo.username)
        } else {
          console.log('❌ User is not authenticated')
        }
      } catch (error) {
        console.log('❌ Authentication check failed:', error)
      } finally {
        setHasCheckedAuth(true)
      }
    }

    checkAuthStatus()
  }, [hasCheckedAuth, setUsername])

  // Connect WebSocket when user logs in (only after auth check is complete)
  useEffect(() => {
    if (hasCheckedAuth && state.username && !state.isConnected && !state.isConnecting) {
      console.log('🔌 Connecting WebSocket for user:', state.username)
      setConnecting(true)

      try {
        connect()
      } catch (error) {
        console.error('❌ Failed to connect WebSocket:', error)
        setConnecting(false)
      }

      // Set a timeout to reset connecting state if connection takes too long
      const timeout = setTimeout(() => {
        if (!state.isConnected) {
          console.warn('⏰ WebSocket connection timeout - resetting connecting state')
          setConnecting(false)
        }
      }, 5000)

      return () => clearTimeout(timeout)
    }
  }, [hasCheckedAuth, state.username, state.isConnected, state.isConnecting, connect, setConnecting])

  // Handle page reload: Fetch HTTP first, then connect WebSocket
  useEffect(() => {
    if (hasCheckedAuth && state.gameId && state.username && !state.gameState && !state.isConnected && !isInitializing) {
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
  }, [hasCheckedAuth, state.gameId, state.username, state.gameState, state.isConnected, isInitializing, setGameState, setConnecting, connect, resetGame, setIsInitializing])

  // Removed duplicate WebSocket connection logic - handled by first useEffect

  // Note: Game subscription is handled by LobbyPage when joining games
  // No need for duplicate subscription here

  // Show loading while checking authentication
  if (!hasCheckedAuth) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        zIndex: 9999
      }}>
        <div style={{ textAlign: 'center' }}>
          <h3>Loading...</h3>
          <p>Checking authentication status</p>
        </div>
      </div>
    )
  }

  return null
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
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
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App

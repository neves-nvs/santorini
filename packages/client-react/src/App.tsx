import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './store/AppContext'
import { ToastProvider } from './store/ToastContext'
import { useEffect, useState } from 'react'
import { useApp } from './store/AppContext'
import { apiService } from './services/ApiService'
import HomePage from './pages/HomePage'
import GamePage from './features/game/pages/GamePage'
import AuthPage from './features/auth/pages/AuthPage'
import LobbyPage from './features/lobby/pages/LobbyPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import './App.css'

const AppInitializer = ({ onInitialized }: { onInitialized: (initialized: boolean) => void }) => {
  const { setUser } = useApp()

  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const authInfo = await apiService.checkAuth()
        if (authInfo) {
          setUser(authInfo)
        }
      } catch (error) {
        console.log('Authentication check failed:', error)
      } finally {
        setIsInitialized(true)
        onInitialized(true)
      }
    }

    checkAuthStatus()
  }, [setUser])

  if (!isInitialized) {
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
          <p>Initializing application</p>
        </div>
      </div>
    )
  }

  return null
}

const AppRoutes = ({ isInitialized }: { isInitialized: boolean }) => {
  const { state } = useApp()

  if (!isInitialized) {
    return null
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/auth"
        element={
          state.username ? <Navigate to="/lobby" replace /> : <AuthPage />
        }
      />
      <Route
        path="/lobby"
        element={
          state.username ? <LobbyPage /> : <Navigate to="/auth" replace />
        }
      />
      <Route
        path="/game"
        element={
          state.username ? <GamePage /> : <Navigate to="/auth" replace />
        }
      />
      <Route
        path="/game/:gameId"
        element={
          state.username ? <GamePage /> : <Navigate to="/auth" replace />
        }
      />
    </Routes>
  )
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false)

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppProvider>
          <Router>
            <div className="app">
              <AppInitializer onInitialized={setIsInitialized} />
              <AppRoutes isInitialized={isInitialized} />
            </div>
          </Router>
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App

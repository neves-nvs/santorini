import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { ToastProvider } from './shared/ui/ToastContext'
import { type ReactNode, lazy, Suspense, useEffect, useState } from 'react'
import { useAppStore } from './user/model/appStore'
import { userApi } from './user/services/userApi'
import HomePage from './shared/pages/HomePage'
import AuthPage from './user/view/AuthPage'
import LobbyPage from './pages/LobbyPage'
import NotFoundPage from './shared/pages/NotFoundPage'
import { ErrorBoundary } from './shared/ui/ErrorBoundary'
import './App.css'

const GamePage = lazy(() => import('./game/view/pages/GamePage'))

const LoadingScreen = () => (
  <div role="status" style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: '#333',
    zIndex: 9999
  }}>
    <div style={{ textAlign: 'center' }}>
      <h3>Loading...</h3>
      <p>Initializing application</p>
    </div>
  </div>
)

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const username = useAppStore((s) => s.username)
  return username ? children : <Navigate to="/auth" replace />
}

// A new game id remounts the page, so leaving the old game closes its socket
const GamePageForId = () => {
  const { gameId } = useParams<{ gameId: string }>()
  return <GamePage key={gameId} />
}

const AppRoutes = () => {
  const username = useAppStore((s) => s.username)
  const setUser = useAppStore((s) => s.setUser)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    userApi
      .checkAuth()
      .then((authInfo) => {
        if (authInfo) setUser(authInfo)
      })
      .catch((error) => console.log('Authentication check failed:', error))
      .finally(() => setIsInitialized(true))
  }, [setUser])

  if (!isInitialized) {
    return <LoadingScreen />
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={username ? <Navigate to="/lobby" replace /> : <AuthPage />} />
        <Route path="/lobby" element={<RequireAuth><LobbyPage /></RequireAuth>} />
        <Route path="/game" element={<RequireAuth><GamePage /></RequireAuth>} />
        <Route path="/game/:gameId" element={<RequireAuth><GamePageForId /></RequireAuth>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <div className="app">
            <AppRoutes />
          </div>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { useWebSocket } from '../hooks/useWebSocket'
import { apiService } from '../services/ApiService'

interface GameInfo {
  id: number
  user_creator_id: number
  created_at: string
  player_count: number
  started_at: string | null
  game_status: string
  game_phase: string | null
  current_player_id: number | null
  winner_id: number | null
  finished_at: string | null
  current_players: number
  players: number[]
}

const LobbyPage = () => {
  const { state, setGameId, setUsername, logout } = useGame()
  const { isConnected, subscribeToGame, joinGame } = useWebSocket()
  const navigate = useNavigate()
  
  const [availableGames, setAvailableGames] = useState<GameInfo[]>([])
  const [playerCount, setPlayerCount] = useState(2)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [usernameInput, setUsernameInput] = useState(state.username || '')
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isGettingUser, setIsGettingUser] = useState(false)

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!state.username) {
      navigate('/auth')
    }
  }, [state.username, navigate])

  // Get current user info once when component mounts
  useEffect(() => {
    if (state.username && !currentUserId) {
      getCurrentUserInfo()
    }
  }, [state.username, currentUserId])

  // Auto-refresh games on mount and periodically
  useEffect(() => {
    if (state.username) {
      handleRefreshGames()

      // Set up periodic refresh every 30 seconds (reasonable interval)
      const interval = setInterval(() => {
        handleRefreshGames()
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [state.username]) // Only depends on username

  const getCurrentUserInfo = async () => {
    // Prevent multiple simultaneous user info requests
    if (isGettingUser) {
      console.log('🚫 User info request already in progress, skipping...')
      return
    }

    setIsGettingUser(true)
    try {
      const user = await apiService.getCurrentUser()
      setCurrentUserId(user.id)
      console.log('✅ Got current user info:', user.id)
    } catch (err) {
      console.error('Failed to get current user:', err)
    } finally {
      setIsGettingUser(false)
    }
  }

  const handleCreateGame = async () => {
    if (!state.username) {
      setError('Please login first')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await apiService.createGame({ player_count: playerCount })
      console.log('Game created:', result)

      if (result.gameId) {
        const gameId = result.gameId.toString()

        // Creator automatically joins the game via WebSocket (eliminates race condition)
        setGameId(gameId)
        joinGame(gameId, state.username) // This handles both joining and subscribing
        navigate(`/game/${gameId}`)
      }
    } catch (err) {
      console.error('Failed to create game:', err)
      setError('Failed to create game. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinGame = async (game: GameInfo) => {
    if (!state.username) {
      setError('Please login first')
      return
    }

    setLoading(true)
    setError('')

    try {
      const gameId = game.id.toString()
      const gamePlayers = game.players || []
      const isPlayerInGame = currentUserId && gamePlayers.includes(currentUserId)

      // Join game via WebSocket (handles both joining and subscribing)
      setGameId(gameId)
      if (!isPlayerInGame) {
        joinGame(gameId, state.username) // Join and subscribe in one atomic operation
      } else {
        subscribeToGame(gameId, state.username) // Just subscribe if already in game
      }
      navigate(`/game/${gameId}`)
    } catch (err) {
      console.error('Failed to join game:', err)
      setError('Failed to join game. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshGames = async () => {
    // Prevent multiple simultaneous requests
    if (isRefreshing) {
      console.log('🚫 Refresh already in progress, skipping...')
      return
    }

    setIsRefreshing(true)
    setLoading(true)
    setError('')

    try {
      // Single request that returns games with player counts included
      const games = await apiService.getGamesWithPlayerCounts()
      setAvailableGames(games)
      console.log('✅ Fetched games with player counts in single request:', games.length)
    } catch (err) {
      console.error('Failed to fetch games:', err)
      setError('Failed to fetch games. Please try again.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleSetUsername = () => {
    if (usernameInput.trim()) {
      setUsername(usernameInput.trim())
    }
  }

  const handleLogout = async () => {
    try {
      // Call server logout to clear cookies
      await apiService.logout()
    } catch (error) {
      console.error('Logout API call failed:', error)
      // Continue with client-side logout even if server call fails
    }

    // Clear user data and redirect to home
    logout()
    navigate('/')
  }

  if (!state.username) {
    return <div>Redirecting to login...</div>
  }

  return (
    <div className="page" style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '3rem'
        }}>
          <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Game Lobby</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div>
              <strong>Player:</strong> {state.username}
            </div>
            <div>
              <strong>Status:</strong>
              <span style={{
                color: isConnected ? 'lightgreen' : (state.isConnecting ? 'yellow' : 'orange'),
                marginLeft: '0.5rem'
              }}>
                {isConnected ? 'Connected' : (state.isConnecting ? 'Connecting...' : 'Disconnected')}
              </span>
            </div>
            <button onClick={handleLogout} style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid white',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Logout
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            background: 'rgba(255, 0, 0, 0.2)',
            border: '1px solid rgba(255, 0, 0, 0.5)',
            color: 'white',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '2rem'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Create Game Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Create New Game</h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                Number of Players:
              </label>
              <select 
                value={playerCount} 
                onChange={(e) => setPlayerCount(Number(e.target.value))}
                style={{ 
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  background: 'white'
                }}
              >
                <option value={2}>2 Players</option>
                <option value={3}>3 Players</option>
                <option value={4}>4 Players</option>
              </select>
            </div>
            
            <button 
              onClick={handleCreateGame} 
              disabled={loading || !isConnected}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1.1rem',
                background: loading || !isConnected ? '#666' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading || !isConnected ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.3s'
              }}
            >
              {loading ? 'Creating...' : 'Create Game'}
            </button>
          </div>

          {/* Join Game Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ margin: 0 }}>Available Games</h2>
              <button 
                onClick={handleRefreshGames}
                disabled={loading}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid white',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              {availableGames.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)' }}>
                  No games available. Create one to get started!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {availableGames.map((game) => {
                    const gamePlayers = game.players || []
                    const isPlayerInGame = currentUserId && gamePlayers.includes(currentUserId)
                    const canJoin = isConnected && (game.game_status === 'waiting' || isPlayerInGame)

                    return (
                      <div key={game.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px'
                      }}>
                        <div>
                          <div><strong>Game {game.id}</strong></div>
                          <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                            {game.current_players}/{game.player_count} players • {game.game_status}
                            {isPlayerInGame && <span style={{ color: 'lightgreen' }}> • You're in this game</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleJoinGame(game)}
                          disabled={!canJoin}
                          style={{
                            padding: '0.5rem 1rem',
                            background: !canJoin ? '#666' : (isPlayerInGame ? '#FF9800' : '#2196F3'),
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: !canJoin ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {isPlayerInGame ? 'Rejoin' : (game.game_status === 'waiting' ? 'Join' : game.game_status)}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <Link to="/" style={{ 
            color: 'white', 
            textDecoration: 'none',
            fontSize: '1.1rem'
          }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LobbyPage

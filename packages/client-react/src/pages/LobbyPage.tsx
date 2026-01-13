import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { apiService } from '../services/ApiService'
import { GameInfo } from '../types/game'

const LobbyPage = () => {
  const { state, logout } = useApp()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [availableGames, setAvailableGames] = useState<GameInfo[]>([])
  const [playerCount, setPlayerCount] = useState(2)

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

  const handleCreateGame = async () => {
    if (!state.username) {
      setError('Please login first')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await apiService.createGame({ maxPlayers: playerCount })
      if (result.gameId) {
        const gameId = result.gameId.toString()
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
      console.log('✅ Fetched', games.length, 'games')
    } catch (err) {
      console.error('Failed to fetch games:', err)
      setError('Failed to fetch games. Please try again.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
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

  // Authentication is now guaranteed by App-level routing

  return (
    <div className="page" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: 'clamp(1rem, 4vw, 2rem)',
      overflowY: 'auto'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: 'clamp(1.5rem, 4vw, 3rem)'
        }}>
          <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', margin: 0 }}>Game Lobby</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 'clamp(0.85rem, 2.5vw, 1rem)' }}>
              <strong>Player:</strong> {state.username}
            </div>
            <button onClick={handleLogout} style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid white',
              color: 'white',
              padding: '0.4rem 0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: 'clamp(0.8rem, 2vw, 1rem)'
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

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'clamp(1rem, 3vw, 2rem)'
        }}>
          {/* Create Game Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: 'clamp(1rem, 3vw, 2rem)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Create New Game</h2>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)' }}>
                Number of Players:
              </label>
              <select
                value={playerCount}
                onChange={(e) => setPlayerCount(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.6rem',
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
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
                background: loading ? '#666' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.3s'
              }}
            >
              {loading ? 'Creating...' : 'Create Game'}
            </button>
          </div>

          {/* Join Game Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: 'clamp(1rem, 3vw, 2rem)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              <h2 style={{ margin: 0 }}>Available Games</h2>
              <button
                onClick={handleRefreshGames}
                disabled={loading}
                style={{
                  padding: '0.4rem 0.75rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid white',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: 'clamp(0.8rem, 2vw, 1rem)'
                }}
              >
                {loading ? '...' : 'Refresh'}
              </button>
            </div>

            <div style={{
              maxHeight: 'clamp(200px, 40vh, 300px)',
              overflowY: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem'
            }}>
              {availableGames.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)' }}>
                  No games available. Create one to get started!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {availableGames.map((game) => {
                    const isPlayerInGame = false
                    const canJoin = game.status === 'waiting' || isPlayerInGame

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
                            {game.playerCount}/{game.maxPlayers} players • {game.status}
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
                          {isPlayerInGame ? 'Rejoin' : (game.status === 'waiting' ? 'Join' : game.status)}
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

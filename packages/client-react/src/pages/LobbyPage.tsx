import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/user/model/appStore'
import { userApi } from '@/user/services/userApi'
import { gameApi } from '@/game/services/gameApi'
import { usePageTitle } from '@/shared/utils/usePageTitle'
import type { GameSummary } from '@santorini/shared'
import './LobbyPage.css'

const GAMES_REFRESH_INTERVAL_MS = 30_000

type GameTab = 'available' | 'my-games'

type ActionTone = 'join' | 'open' | 'resume'

interface GameAction {
  label: string
  tone: ActionTone
}

const myGameAction = (game: GameSummary): GameAction => {
  if (game.status === 'in-progress') return { label: 'Resume', tone: 'resume' }
  return { label: game.status === 'waiting' ? 'Enter' : 'View', tone: 'open' }
}

interface GameListProps {
  games: GameSummary[]
  emptyText: string
  actionFor: (game: GameSummary) => GameAction
  onOpen: (game: GameSummary) => void
}

const GameList = ({ games, emptyText, actionFor, onOpen }: GameListProps) => {
  if (games.length === 0) {
    return <div className="lobby-empty">{emptyText}</div>
  }

  return (
    <div className="lobby-game-list">
      {games.map((game) => {
        const { label, tone } = actionFor(game)
        return (
          <div key={game.id} className="lobby-game">
            <div>
              <div><strong>Game {game.id}</strong></div>
              <div className="lobby-game-status">
                {game.playerCount}/{game.maxPlayers} players • {game.status}
              </div>
            </div>
            <button
              onClick={() => onOpen(game)}
              aria-label={`${label} game ${game.id}`}
              className={`lobby-game-action lobby-game-action--${tone}`}
            >
              {label}
            </button>
          </div>
        )
      })}
    </div>
  )
}

const LobbyPage = () => {
  const username = useAppStore((s) => s.username)
  const logout = useAppStore((s) => s.logout)
  usePageTitle('Lobby')
  const navigate = useNavigate()
  const playerCountId = useId()

  const [loading, setLoading] = useState(Boolean(username))
  const [error, setError] = useState('')
  const refreshInFlight = useRef(false)

  const [availableGames, setAvailableGames] = useState<GameSummary[]>([])
  const [myGames, setMyGames] = useState<GameSummary[]>([])
  const [activeTab, setActiveTab] = useState<GameTab>('available')
  const [playerCount, setPlayerCount] = useState(2)

  const fetchGames = useCallback(async () => {
    refreshInFlight.current = true

    try {
      // Fetch both available games and my games in parallel
      const [available, mine] = await Promise.all([
        gameApi.getGames(),
        gameApi.getMyGames()
      ])
      setAvailableGames(available)
      setMyGames(mine)
      console.log('Fetched', available.length, 'available games,', mine.length, 'my games')
    } catch (err) {
      console.error('Failed to fetch games:', err)
      setError('Failed to fetch games. Please try again.')
    } finally {
      refreshInFlight.current = false
      setLoading(false)
    }
  }, [])

  const handleRefreshGames = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (refreshInFlight.current) {
      console.log('Refresh already in progress, skipping...')
      return
    }

    setLoading(true)
    setError('')
    await fetchGames()
  }, [fetchGames])

  useEffect(() => {
    if (!username) return

    // eslint-disable-next-line react-hooks/set-state-in-effect -- the state is set after the request resolves, not synchronously
    fetchGames()

    const interval = setInterval(() => {
      handleRefreshGames()
    }, GAMES_REFRESH_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [username, fetchGames, handleRefreshGames])

  const handleCreateGame = async () => {
    if (!username) {
      setError('Please login first')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await gameApi.createGame({ maxPlayers: playerCount })
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

  const handleJoinGame = async (game: GameSummary) => {
    if (!username) {
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

  const handleLogout = async () => {
    try {
      // Call server logout to clear cookies
      await userApi.logout()
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
    <main className="page lobby-page">
      <div className="lobby-content">
        <div className="lobby-header">
          <h1 className="lobby-title">Game Lobby</h1>
          <div className="lobby-user">
            <div className="lobby-username">
              <strong>Player:</strong> {username}
            </div>
            <button onClick={handleLogout} className="lobby-chip-button">
              Logout
            </button>
          </div>
        </div>

        <p role="status" className="visually-hidden">{loading ? 'Loading games' : ''}</p>

        {error && (
          <div role="alert" className="lobby-error">
            {error}
          </div>
        )}

        <div className="lobby-panels">
          <div className="lobby-panel">
            <h2 className="lobby-panel-title">Create New Game</h2>

            <div className="lobby-field">
              <label htmlFor={playerCountId} className="lobby-label">
                Number of Players
              </label>
              <select
                id={playerCountId}
                className="lobby-select"
                value={playerCount}
                onChange={(e) => setPlayerCount(Number(e.target.value))}
              >
                <option value={2}>2 Players</option>
                <option value={3}>3 Players</option>
                <option value={4}>4 Players</option>
              </select>
            </div>

            <button onClick={handleCreateGame} disabled={loading} className="lobby-create">
              {loading ? 'Creating...' : 'Create Game'}
            </button>
          </div>

          <div className="lobby-panel">
            <div className="lobby-toolbar">
              <div className="lobby-tabs">
                <button
                  onClick={() => setActiveTab('available')}
                  aria-pressed={activeTab === 'available'}
                  className="lobby-tab"
                >
                  Available ({availableGames.length})
                </button>
                <button
                  onClick={() => setActiveTab('my-games')}
                  aria-pressed={activeTab === 'my-games'}
                  className="lobby-tab"
                >
                  My Games ({myGames.length})
                </button>
              </div>
              <button onClick={handleRefreshGames} disabled={loading} className="lobby-chip-button">
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            <div aria-busy={loading} className="lobby-games">
              {activeTab === 'available' ? (
                <GameList
                  games={availableGames}
                  emptyText="No games available. Create one to get started!"
                  actionFor={() => ({ label: 'Join', tone: 'join' })}
                  onOpen={handleJoinGame}
                />
              ) : (
                <GameList
                  games={myGames}
                  emptyText="You haven't joined any games yet."
                  actionFor={myGameAction}
                  onOpen={handleJoinGame}
                />
              )}
            </div>
          </div>
        </div>

        <div className="lobby-nav">
          <Link to="/" className="lobby-nav-link">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
}

export default LobbyPage

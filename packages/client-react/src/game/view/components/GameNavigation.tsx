import { memo } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '@/user/model/appStore'
import { useGameId } from '@/game/model/gameSelectors'

const GameNavigation = memo(() => {
  const username = useAppStore((s) => s.username)
  const gameId = useGameId()

  return (
    <nav aria-label="Game" className="game-menu">
      <details className="game-menu-disclosure">
        <summary className="game-menu-trigger">Menu</summary>
        <div className="game-menu-panel">
          <p className="game-menu-context">
            {username || 'Guest'}{gameId ? ` · Game ${gameId}` : ''}
          </p>
          <Link to="/lobby" className="game-menu-link">Go to lobby</Link>
          <Link to="/" className="game-menu-link">Home</Link>
        </div>
      </details>
    </nav>
  )
})

GameNavigation.displayName = 'GameNavigation'

export default GameNavigation

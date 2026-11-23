import { Link } from 'react-router-dom'
import { useAppStore } from '@/user/model/appStore'

export default function GameNavigation() {
  const username = useAppStore((state) => state.username)

  return (
    <nav className="game-navigation" aria-label="Game">
      <Link className="game-navigation-back" to="/lobby" aria-label="Back to Lobby">
        <span aria-hidden="true">←</span> Lobby
      </Link>
      {username && <span className="game-player-name">{username}</span>}
    </nav>
  )
}

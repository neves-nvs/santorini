import { memo } from 'react'
import { useGameState } from '@/game/model/gameSelectors'
import { PLAYER_COLORS } from '@/game/model/gameConstants'
import { useAppStore } from '@/user/model/appStore'

const PlayerList = memo(() => {
  const gameState = useGameState()
  const currentUserId = useAppStore((s) => s.userId)
  const username = useAppStore((s) => s.username)

  if (!gameState) return <p className="game-players-loading">Loading players...</p>

  const seats = gameState.totalPlayers || 2
  const players = gameState.players
  const isWaiting = gameState.status === 'waiting'

  return (
    <>
      <div className="game-players-header">
        <h2>Players ({players.length}/{seats})</h2>
      </div>
      <ul className="game-player-list">
      {Array.from({ length: seats }, (_, index) => {
        const player = gameState.players[index]
        const isCurrentPlayer = player !== undefined && index === gameState.currentSeat
        const isYou = player !== undefined && player.userId === currentUserId
        const isConnected = player?.isConnected ?? false
        const connectionLabel = isConnected ? 'Connected' : 'Disconnected'

        return (
          <li
            key={player?.userId ?? `empty-seat-${index}`}
            className={`game-player${isCurrentPlayer ? ' game-player--active' : ''}${!player ? ' game-player--empty' : ''}`}
          >
            <span
              aria-hidden="true"
              className="game-player-color"
              style={{ backgroundColor: PLAYER_COLORS[index] || '#94a3b8' }}
            />
            <span className="game-player-copy">
              <strong className="game-player-name">
                {player ? `P${index + 1}` : 'Waiting for player'}
              </strong>
              {player && isYou && <span className="game-player-you">{username || 'You'} · You</span>}
              {isCurrentPlayer && <span className="game-player-turn">{isYou ? 'Your turn' : 'Current turn'}</span>}
            </span>
            {player ? (
              <span
                role="img"
                aria-label={connectionLabel}
                title={connectionLabel}
                className={`game-player-connection${isConnected ? ' game-player-connection--online' : ' game-player-connection--offline'}`}
              />
            ) : (
              <span className="game-player-waiting">Open</span>
            )}
            {player && isWaiting && (
              <span className={`game-player-ready${player.isReady ? ' game-player-ready--yes' : ''}`}>
                {player.isReady ? 'Ready' : 'Not ready'}
              </span>
            )}
          </li>
        )
      })}
      </ul>
    </>
  )
})

PlayerList.displayName = 'PlayerList'

export default PlayerList

import { memo, useEffect } from 'react'
import { useGameState } from '../../store/gameSelectors'
import { PLAYER_COLORS } from '../../constants/gameConstants'
import type { PlayerView } from '../../types/game'

interface PlayerListProps {
  className?: string
  style?: React.CSSProperties
}

/**
 * Displays the list of players in the game with their colors and status
 */
const PlayerList = memo(({ className, style }: PlayerListProps) => {
  const gameState = useGameState()

  // Debug: Log when player list changes
  useEffect(() => {
    console.log('🎭 PlayerList re-rendered with players:', gameState?.players)
  }, [gameState?.players])

  // Handle undefined/null players gracefully
  const players = gameState?.players || []

  if (!gameState || players.length === 0) {
    return (
      <div className={className} style={style}>
        <p>{gameState ? 'No players' : 'Loading players...'}</p>
      </div>
    )
  }

  return (
    <div className={className} style={style}>
      <h3>Players ({players.length}/{gameState.totalPlayers || 2})</h3>

      {Array.isArray(players) ? (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {players.map((player: PlayerView, index: number) => {
            const playerId = player.id
            const playerName = `Player ${player.seat + 1}`
            const playerColor = PLAYER_COLORS[index] || '#ffffff'
            const isCurrentPlayer = playerId === gameState?.currentPlayerId

            return (
              <li
                key={playerId}
                style={{
                  marginBottom: '0.5rem',
                  padding: '0.5rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  border: isCurrentPlayer ? '2px solid yellow' : '1px solid transparent'
                }}
              >
                <span
                  style={{
                    color: playerColor,
                    fontWeight: 'bold',
                    marginRight: '0.5rem'
                  }}
                >
                  ●
                </span>
                {playerName}
                {isCurrentPlayer && ' (Current)'}
              </li>
            )
          })}
        </ul>
      ) : (
        <div>Players: {JSON.stringify(gameState.players)}</div>
      )}
    </div>
  )
})

PlayerList.displayName = 'PlayerList'

export default PlayerList

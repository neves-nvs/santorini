import { memo, useEffect } from 'react'
import { useGameState } from '@/game/model/gameSelectors'
import { PLAYER_COLORS } from '@/game/model/gameConstants'
import type { PlayerView } from '@/game/model/game'

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
    console.log('PlayerList re-rendered with players:', gameState?.players)
  }, [gameState?.players])

  // Handle undefined/null players gracefully
  const players = gameState?.players || []

  if (!gameState) {
    return (
      <div className={className} style={style}>
        <p>Loading players...</p>
      </div>
    )
  }

  const seats = gameState.totalPlayers || 2

  return (
    <div className={className} style={style}>
      <h3 style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)', margin: '0 0 0.5rem 0' }}>
        Players ({players.length}/{seats})
      </h3>

      {Array.isArray(players) ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {Array.from({ length: seats }, (_, index) => {
            const player: PlayerView | undefined = players[index]
            const playerColor = PLAYER_COLORS[index] || '#ffffff'
            const isCurrentPlayer = player !== undefined && index === gameState?.currentSeat

            return (
              <li
                key={index}
                style={{
                  opacity: player ? 1 : 0.5,
                  marginBottom: '0.25rem',
                  padding: '0.35rem 0.5rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  border: isCurrentPlayer
                    ? '2px solid yellow'
                    : player
                      ? '1px solid transparent'
                      : '1px dashed rgba(255, 255, 255, 0.4)',
                  fontSize: 'clamp(0.8rem, 2vw, 0.9rem)'
                }}
              >
                <span
                  style={{
                    color: playerColor,
                    fontWeight: 'bold',
                    marginRight: '0.35rem'
                  }}
                >
                  ●
                </span>
                {player ? `P${index + 1}` : 'Waiting for a player'}
                {isCurrentPlayer && ' ★'}
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

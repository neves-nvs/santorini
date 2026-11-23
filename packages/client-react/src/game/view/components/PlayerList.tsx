import { memo, useEffect } from 'react'
import { useGameState } from '@/game/model/gameSelectors'
import { PLAYER_COLORS } from '@/game/model/gameConstants'
import type { PlayerView } from '@/game/model/game'
import './PlayerList.css'

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
      <div className={`player-list${className ? ` ${className}` : ''}`} style={style}>
        <p>Loading players...</p>
      </div>
    )
  }

  const seats = gameState.totalPlayers || 2

  return (
    <div className={`player-list${className ? ` ${className}` : ''}`} style={style}>
      <h3 className="player-list__heading">
        Players ({players.length}/{seats})
      </h3>

      {Array.isArray(players) ? (
        <ul className="player-list__items">
          {Array.from({ length: seats }, (_, index) => {
            const player: PlayerView | undefined = players[index]
            const playerColor = PLAYER_COLORS[index] || '#ffffff'
            const isCurrentPlayer = player !== undefined && index === gameState?.currentSeat

            return (
              <li
                key={index}
                className={`player-list__item${!player ? ' player-list__item--waiting' : ''}${isCurrentPlayer ? ' player-list__item--current' : ''}`}
                style={{ opacity: player ? 1 : 0.72 }}
              >
                <span
                  className={`player-list__marker${player ? ' player-list__marker--connected' : ' player-list__marker--waiting'}`}
                  style={{ color: playerColor }}
                  role="img"
                  aria-label={player ? 'Connected' : 'Waiting for a player'}
                  title={player ? 'Connected' : 'Waiting for a player'}
                >
                  {player ? '●' : '○'}
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

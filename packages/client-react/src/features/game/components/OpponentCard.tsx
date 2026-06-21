import { memo } from 'react'
import { useGameState } from '../store/gameSelectors'
import { useApp } from '../../../store/AppContext'
import { PLAYER_COLORS } from '../../../constants/gameConstants'
import type { PlayerView } from '../types/game'

interface OpponentCardProps {
  className?: string
  style?: React.CSSProperties
}

const OpponentCard = memo(({ className, style }: OpponentCardProps) => {
  const gameState = useGameState()
  const { state: appState } = useApp()

  const players = gameState?.players || []
  const currentUserId = appState.userId

  // Find opponent (player that isn't the current user)
  const opponent = players.find((p: PlayerView) => p.userId !== currentUserId)

  if (!opponent) return null

  const opponentIndex = players.findIndex((p: PlayerView) => p.userId === opponent.userId)
  const opponentColor = PLAYER_COLORS[opponentIndex] || '#ffffff'
  const isOpponentTurn = opponent.id === gameState?.currentPlayerId
  const displayName = `Player ${opponent.seat + 1}`

  return (
    <div
      className={['opponent-card-responsive', className].filter(Boolean).join(' ')}
      style={{
        position: 'absolute',
        top: 'clamp(60px, 10vh, 80px)',
        right: 'clamp(10px, 2vw, 20px)',
        left: 'auto',
        transform: 'none',
        background: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: 'clamp(0.6rem, 2vw, 1rem)',
        borderRadius: '12px',
        zIndex: 1000,
        pointerEvents: 'auto',
        minWidth: 'clamp(140px, 25vw, 180px)',
        border: isOpponentTurn ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.2)',
        boxShadow: isOpponentTurn ? '0 0 16px rgba(251, 191, 36, 0.4)' : 'none',
        transition: 'border 0.2s ease, box-shadow 0.2s ease',
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        {/* Player color indicator */}
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: opponentColor,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontWeight: 600,
            fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </span>
      </div>

      {/* Turn indicator */}
      <div
        style={{
          fontSize: 'clamp(0.7rem, 2vw, 0.8rem)',
          color: isOpponentTurn ? '#fbbf24' : '#9ca3af',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isOpponentTurn ? '#fbbf24' : '#6b7280',
            animation: isOpponentTurn ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }}
        />
        {isOpponentTurn ? 'Their turn' : 'Waiting'}
      </div>

      {/* Inline keyframes for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        @media (max-width: 640px) {
          .opponent-card-responsive {
            right: 50% !important;
            left: auto !important;
            transform: translateX(50%) !important;
          }
        }
      `}</style>
    </div>
  )
})

OpponentCard.displayName = 'OpponentCard'

export default OpponentCard

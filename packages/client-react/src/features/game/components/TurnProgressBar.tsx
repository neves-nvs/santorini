import { memo, type ReactNode } from 'react'
import { useGameLifecycle } from '../hooks/useGameLifecycle'
import { useGameState, useIsMyTurn } from '../store/gameSelectors'
import { useApp } from '../../../store/AppContext'
import { PLAYER_COLORS } from '../../../constants/gameConstants'
import type { PlayerView } from '../types/game'
import { HammerIcon, RunningIcon } from './icons'

type TurnStage = 'move' | 'build'

interface StageConfig {
  id: TurnStage
  icon: (size: number) => ReactNode
}

const stages: StageConfig[] = [
  { id: 'move', icon: (size) => <RunningIcon size={size} /> },
  { id: 'build', icon: (size) => <HammerIcon size={size} /> },
]

function getCurrentStage(sub: string | null): TurnStage | null {
  if (sub === 'MOVING') return 'move'
  if (sub === 'BUILDING') return 'build'
  return null
}

interface ProgressBarContentProps {
  currentStage: TurnStage | null
  isActive: boolean
  accentColor: string
  compact?: boolean
}

const ProgressBarContent = memo(({ currentStage, isActive, accentColor, compact }: ProgressBarContentProps) => (
  <>
    {stages.map((stage, index) => {
      const isCurrentStage = stage.id === currentStage
      const isPast = currentStage === 'build' && stage.id === 'move'
      const iconSize = compact ? 20 : 26
      const circleSize = compact ? 'clamp(28px, 6vw, 36px)' : 'clamp(36px, 8vw, 48px)'

      return (
        <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: compact ? '4px' : '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              opacity: !isActive ? 0.4 : isCurrentStage ? 1 : isPast ? 0.6 : 0.3,
              transition: 'opacity 0.2s ease',
            }}
          >
            <div
              style={{
                width: circleSize,
                height: circleSize,
                borderRadius: '50%',
                background: isPast ? '#22c55e' : '#374151',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                border: isCurrentStage && isActive ? `3px solid ${accentColor}` : '3px solid transparent',
                boxSizing: 'border-box',
              }}
            >
              {stage.icon(iconSize)}
            </div>
          </div>
          {index < stages.length - 1 && (
            <div
              style={{
                width: compact ? 'clamp(12px, 3vw, 20px)' : 'clamp(16px, 4vw, 32px)',
                height: '2px',
                background: isPast ? '#22c55e' : '#374151',
              }}
            />
          )}
        </div>
      )
    })}
  </>
))

ProgressBarContent.displayName = 'ProgressBarContent'

interface TurnProgressBarProps {
  className?: string
  style?: React.CSSProperties
}

const TurnProgressBar = memo(({ className, style }: TurnProgressBarProps) => {
  const { lifecycle } = useGameLifecycle()
  const gameState = useGameState()
  const isMyTurn = useIsMyTurn()
  const { state: appState } = useApp()

  // Only show during active gameplay (moving/building phases)
  if (lifecycle.main !== 'IN_PROGRESS') return null
  if (lifecycle.sub === 'PLACING') return null

  const currentStage = getCurrentStage(lifecycle.sub)
  const players = gameState?.players || []
  const currentUserId = appState.userId

  // Find player indices for colors
  const myIndex = players.findIndex((p: PlayerView) => p.userId === currentUserId)
  const opponentIndex = players.findIndex((p: PlayerView) => p.userId !== currentUserId)
  const myColor = PLAYER_COLORS[myIndex] || '#3b82f6'
  const opponentColor = PLAYER_COLORS[opponentIndex] || '#ef4444'

  return (
    <>
      {/* Player's progress bar - bottom */}
      <div
        className={className}
        style={{
          position: 'absolute',
          bottom: 'clamp(10px, 2vw, 20px)',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          zIndex: 1000,
          pointerEvents: 'none',
          ...style,
        }}
      >
        <ProgressBarContent
          currentStage={isMyTurn ? currentStage : null}
          isActive={isMyTurn}
          accentColor={myColor}
        />
      </div>

      {/* Opponent's progress bar - top (below status bar) */}
      <div
        style={{
          position: 'absolute',
          top: 'clamp(60px, 10vh, 80px)',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '4px',
          zIndex: 999,
          pointerEvents: 'none',
        }}
      >
        <ProgressBarContent
          currentStage={!isMyTurn ? currentStage : null}
          isActive={!isMyTurn}
          accentColor={opponentColor}
          compact
        />
      </div>
    </>
  )
})

TurnProgressBar.displayName = 'TurnProgressBar'

export default TurnProgressBar

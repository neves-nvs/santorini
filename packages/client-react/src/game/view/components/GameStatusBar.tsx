import { memo } from 'react'
import { useGameLifecycle } from '@/game/view/hooks/useGameLifecycle'

interface GameStatusBarProps {
  className?: string
  style?: React.CSSProperties
}

/**
 * Simple status bar that shows the current game status message
 * Uses the clean lifecycle system to determine what to display
 */
const GameStatusBar = memo(({ className, style }: GameStatusBarProps) => {
  const { statusMessage } = useGameLifecycle()

  return (
    <div
      role="status"
      className={`game-status-bar${className ? ` ${className}` : ''}`}
      style={style}
    >
      {statusMessage}
    </div>
  )
})

GameStatusBar.displayName = 'GameStatusBar'

export default GameStatusBar

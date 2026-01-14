import { memo } from 'react'
import { useGameLifecycle } from '../../hooks/useGameLifecycle'

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
      className={className}
      style={{
        position: 'absolute',
        top: 'clamp(10px, 2vw, 20px)',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(0.75rem, 3vw, 1.5rem)',
        borderRadius: '8px',
        fontSize: 'clamp(0.85rem, 2.5vw, 1.1rem)',
        fontWeight: 'bold',
        zIndex: 1000,
        textAlign: 'center',
        width: 'max-content',
        maxWidth: 'calc(100vw - 40px)',
        pointerEvents: 'none', // Don't block clicks - this is just text
        ...style
      }}
    >
      {statusMessage}
    </div>
  )
})

GameStatusBar.displayName = 'GameStatusBar'

export default GameStatusBar

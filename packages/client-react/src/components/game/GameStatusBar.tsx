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
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        zIndex: 1000,
        textAlign: 'center',
        minWidth: '300px',
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

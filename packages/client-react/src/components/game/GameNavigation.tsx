import { memo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../store/AppContext'
import { useIsConnected, useGameId } from '../../store/gameSelectors'

interface GameNavigationProps {
  className?: string
  style?: React.CSSProperties
}

/**
 * Persistent navigation component that's always visible during games
 * Provides links back to lobby and home, plus connection status
 */
const GameNavigation = memo(({ className, style }: GameNavigationProps) => {
  const { state: appState } = useApp()
  const isConnected = useIsConnected()
  const gameId = useGameId()

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        top: 'clamp(10px, 2vw, 20px)',
        left: 'clamp(10px, 2vw, 20px)',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: 'clamp(0.5rem, 2vw, 1rem)',
        borderRadius: '8px',
        fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
        zIndex: 1000,
        maxWidth: 'calc(50vw - 20px)',
        pointerEvents: 'auto', // Allow clicks on this component
        ...style
      }}
    >
      {/* User Info */}
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
          {appState.username || 'Guest'}
        </div>
        <div style={{ fontSize: '0.8rem' }}>
          <span style={{ color: isConnected ? '#4CAF50' : '#f44336' }}>
            ● {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {gameId && (
          <div style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '0.25rem' }}>
            Game: {gameId}
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Link 
          to="/lobby" 
          style={{ 
            color: '#4CAF50', 
            textDecoration: 'none',
            padding: '0.5rem',
            background: 'rgba(76, 175, 80, 0.1)',
            borderRadius: '4px',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            textAlign: 'center',
            fontSize: '0.85rem',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 0.1)'
          }}
        >
          ← Back to Lobby
        </Link>
        
        <Link 
          to="/" 
          style={{ 
            color: '#2196F3', 
            textDecoration: 'none',
            padding: '0.5rem',
            background: 'rgba(33, 150, 243, 0.1)',
            borderRadius: '4px',
            border: '1px solid rgba(33, 150, 243, 0.3)',
            textAlign: 'center',
            fontSize: '0.85rem',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(33, 150, 243, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(33, 150, 243, 0.1)'
          }}
        >
          Home
        </Link>
      </div>
    </div>
  )
})

GameNavigation.displayName = 'GameNavigation'

export default GameNavigation

import { memo } from 'react'
import { useGameLifecycle } from '../../hooks/useGameLifecycle'
import { useReadyState } from '../../hooks/useReadyState'
import PlayerList from './PlayerList'

interface GameLobbyProps {
  className?: string
  style?: React.CSSProperties
}

/**
 * Lobby component shown when game is in WAITING state
 * Handles player joining, ready checks, and game start
 */
const GameLobby = memo(({ className, style }: GameLobbyProps) => {
  const { ui, gameInfo } = useGameLifecycle()
  const { 
    handleReadyToggle, 
    readyButtonText, 
    isDisabled 
  } = useReadyState()

  // Only show lobby when in waiting state
  if (!ui.showLobbyControls) {
    return null
  }

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        bottom: 'clamp(10px, 2vw, 20px)',
        right: 'clamp(10px, 2vw, 20px)',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: 'clamp(0.75rem, 2vw, 1.5rem)',
        borderRadius: '8px',
        width: 'clamp(200px, 50vw, 300px)',
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto',
        zIndex: 1000,
        pointerEvents: 'auto', // Allow clicks on lobby controls
        ...style
      }}
    >
      <h2 style={{ margin: '0 0 0.75rem 0', fontSize: 'clamp(1rem, 3vw, 1.2rem)' }}>
        Game Lobby
      </h2>

      {/* Player List */}
      <PlayerList style={{ marginBottom: '0.75rem' }} />

      {/* Waiting for players to join */}
      {gameInfo.currentPlayers < gameInfo.totalPlayers && (
        <div style={{ color: 'orange', marginTop: '0.5rem', fontSize: 'clamp(0.8rem, 2vw, 1rem)' }}>
          Waiting for players...
        </div>
      )}

      {/* Ready Button - only show when all players joined */}
      {ui.showReadyButton && (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ color: 'yellow', marginBottom: '0.5rem', fontSize: 'clamp(0.8rem, 2vw, 1rem)' }}>
            Ready to start?
          </div>
          <button
            onClick={handleReadyToggle}
            disabled={isDisabled}
            style={{
              padding: '0.5rem 0.75rem',
              background: isDisabled ? '#666666' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              fontSize: 'clamp(0.85rem, 2vw, 1rem)',
              width: '100%'
            }}
          >
            {readyButtonText}
          </button>
        </div>
      )}

      {/* Game starting message */}
      {ui.showGameControls && (
        <div style={{ color: 'lightgreen', marginTop: '0.5rem', fontSize: 'clamp(0.8rem, 2vw, 1rem)' }}>
          Game active!
        </div>
      )}
    </div>
  )
})

GameLobby.displayName = 'GameLobby'

export default GameLobby

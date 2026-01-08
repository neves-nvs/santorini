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
        top: '50%',
        right: '20px',
        transform: 'translateY(-50%)',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        minWidth: '250px',
        maxWidth: '300px',
        zIndex: 1000,
        pointerEvents: 'auto', // Allow clicks on lobby controls
        ...style
      }}
    >
      {/* Navigation moved to persistent GameNavigation component */}

      <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
        Game Lobby
      </h2>

      {/* Player List */}
      <PlayerList style={{ marginBottom: '1rem' }} />

      {/* Waiting for players to join */}
      {gameInfo.currentPlayers < gameInfo.totalPlayers && (
        <div style={{ color: 'orange', marginTop: '0.5rem' }}>
          Waiting for players to join...
        </div>
      )}

      {/* Ready Button - only show when all players joined */}
      {ui.showReadyButton && (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ color: 'yellow', marginBottom: '0.5rem' }}>
            All players joined! Ready to start?
          </div>
          <button
            onClick={handleReadyToggle}
            disabled={isDisabled}
            style={{
              padding: '0.5rem 1rem',
              background: isDisabled ? '#666666' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              width: '100%'
            }}
          >
            {readyButtonText}
          </button>
        </div>
      )}

      {/* Game starting message */}
      {ui.showGameControls && (
        <div style={{ color: 'lightgreen', marginTop: '0.5rem' }}>
          Game is active! Ready to play.
        </div>
      )}
    </div>
  )
})

GameLobby.displayName = 'GameLobby'

export default GameLobby

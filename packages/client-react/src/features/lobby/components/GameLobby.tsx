import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameLifecycle } from '../../game/hooks/useGameLifecycle'
import { useReadyState } from '../../game/hooks/useReadyState'
import PlayerList from './PlayerList'

interface GameLobbyProps {
  className?: string
  style?: React.CSSProperties
}

/**
 * Lobby component shown when game is in WAITING state
 * Centered overlay with backdrop - handles player joining and ready checks
 */
const GameLobby = memo(({ className, style }: GameLobbyProps) => {
  const navigate = useNavigate()
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

  const handleLeaveGame = () => {
    navigate('/lobby')
  }

  return (
    // Backdrop overlay
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        pointerEvents: 'auto',
      }}
    >
      {/* Centered lobby panel */}
      <div
        className={className}
        style={{
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: 'clamp(1.5rem, 4vw, 2.5rem)',
          borderRadius: '12px',
          width: 'clamp(280px, 80vw, 400px)',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          ...style
        }}
      >
        <h2 style={{
          margin: '0 0 1.5rem 0',
          fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
          textAlign: 'center'
        }}>
          Game Lobby
        </h2>

        {/* Player List */}
        <PlayerList style={{ marginBottom: '1.5rem' }} />

        {/* Waiting for players to join */}
        {gameInfo.currentPlayers < gameInfo.totalPlayers && (
          <div style={{
            color: 'orange',
            marginTop: '0.75rem',
            fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
            textAlign: 'center'
          }}>
            Waiting for players to join ({gameInfo.currentPlayers}/{gameInfo.totalPlayers})...
          </div>
        )}

        {/* Ready Button - only show when all players joined */}
        {ui.showReadyButton && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{
              color: '#ffd700',
              marginBottom: '0.75rem',
              fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
              textAlign: 'center'
            }}>
              All players joined. Ready to start?
            </div>
            <button
              onClick={handleReadyToggle}
              disabled={isDisabled}
              style={{
                padding: '0.75rem 1rem',
                background: isDisabled ? '#666666' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                fontSize: 'clamp(1rem, 2.5vw, 1.1rem)',
                width: '100%',
                fontWeight: 'bold',
                transition: 'background-color 0.2s'
              }}
            >
              {readyButtonText}
            </button>
          </div>
        )}

        {/* Leave game button */}
        <button
          onClick={handleLeaveGame}
          style={{
            marginTop: '1.5rem',
            padding: '0.5rem 1rem',
            background: 'transparent',
            color: '#aaa',
            border: '1px solid #555',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
            width: '100%',
            transition: 'all 0.2s'
          }}
        >
          Leave Game
        </button>
      </div>
    </div>
  )
})

GameLobby.displayName = 'GameLobby'

export default GameLobby

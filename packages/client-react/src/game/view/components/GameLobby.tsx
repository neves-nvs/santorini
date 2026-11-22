import { memo } from 'react'
import { useGameLifecycle } from '@/game/view/hooks/useGameLifecycle'
import { useReadyState } from '@/game/view/hooks/useReadyState'
import PlayerList from './PlayerList'

const GameLobby = memo(() => {
  const { ui, gameInfo } = useGameLifecycle()
  const { handleReadyToggle, readyButtonText, isDisabled } = useReadyState()

  return (
    <section aria-label="Players" className="game-players-panel">
      <PlayerList />

      {ui.showLobbyControls && (
        <div className="game-ready-controls">
          {gameInfo.currentPlayers < gameInfo.totalPlayers ? (
            <p>Waiting for another player to join.</p>
          ) : (
            <>
              <p>{gameInfo.readyCount}/{gameInfo.currentPlayers} players ready</p>
              <button
                type="button"
                onClick={handleReadyToggle}
                disabled={isDisabled}
                className="game-ready-button"
              >
                {readyButtonText}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  )
})

GameLobby.displayName = 'GameLobby'

export default GameLobby

import { memo } from 'react'
import { useAppStore } from '@/user/model/appStore'
import { useGameState, useCurrentPlayerMoves, useIsMyTurn, useIsConnected } from '@/game/model/gameSelectors'
import GameBoard from './GameBoard'
import GameStatusBar from './GameStatusBar'
import GameLobby from './GameLobby'
import GameNavigation from './GameNavigation'
import DebugMenu from './DebugMenu'
import { PerformanceDashboard } from '@/shared/ui/PerformanceDashboard'
import { useDebugState } from '@/game/view/hooks/useDebugState'

const GameUI = memo(() => {
  const gameState = useGameState()
  const currentPlayerMoves = useCurrentPlayerMoves()
  const isMyTurn = useIsMyTurn()
  const isConnected = useIsConnected()

  const appError = useAppStore((s) => s.error)

  // Use debug state hook (includes camera type)
  const { debugState, handleDebugChange, cameraType, toggleCameraType } = useDebugState()

  // All state management moved to custom hooks

  // Ready state logic moved to useReadyState hook

  return (
    <div style={{ pointerEvents: 'none' }}> {/* Don't block 3D board interactions */}
      {/* Full-screen 3D Game Board - always mounted, reads state from store */}
      <GameBoard debugState={debugState} cameraType={cameraType} />

      {/* Persistent Navigation */}
      <GameNavigation />

      {/* Game Status Bar */}
      <GameStatusBar />

      {/* Game Lobby (waiting/ready controls) */}
      <GameLobby />

      {/* Error Display */}
      {appError && (
        <div role="alert" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#b91c1c',
          color: 'white',
          padding: '1rem',
          borderRadius: '8px',
          zIndex: 1000
        }}>
          <strong>Error:</strong> {appError}
        </div>
      )}

      {import.meta.env.DEV && (
        <>
          <DebugMenu
            debugState={debugState}
            onDebugChange={handleDebugChange}
            cameraType={cameraType}
            onToggleCamera={toggleCameraType}
            gameContext={{
              state: {
                gameState,
                isMyTurn,
                currentPlayerMoves
              }
            }}
            isConnected={isConnected}
          />

          <PerformanceDashboard
            visible={debugState.showPerformance}
            onToggle={() => handleDebugChange('showPerformance', !debugState.showPerformance)}
          />
        </>
      )}
    </div>
  )
})

export default GameUI

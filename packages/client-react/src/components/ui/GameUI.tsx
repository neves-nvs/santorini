import { memo } from 'react'
import { useAppStore } from '@/store/appStore'
import { useGameState, useCurrentPlayerMoves, useIsMyTurn, useIsConnected } from '@/store/gameSelectors'
import GameBoard from '@/components/game/GameBoard'
import GameStatusBar from '@/components/game/GameStatusBar'
import GameLobby from '@/components/game/GameLobby'
import GameNavigation from '@/components/game/GameNavigation'
import DebugMenu from '@/components/debug/DebugMenu'
import { PerformanceDashboard } from '@/components/debug/PerformanceDashboard'
import { useDebugState } from '@/hooks/useDebugState'

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
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 0, 0, 0.9)',
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

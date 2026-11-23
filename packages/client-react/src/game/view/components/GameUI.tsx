import { memo } from 'react'
import { useGameId, useGameState, useCurrentPlayerMoves, useIsMyTurn, useIsConnected } from '@/game/model/gameSelectors'
import GameBoard from './GameBoard'
import GameStatusBar from './GameStatusBar'
import GameLobby from './GameLobby'
import GameNavigation from './GameNavigation'
import GameResultPanel from './GameResultPanel'
import GameConnectionFeedback from './GameConnectionFeedback'
import AccessibleMoveControls from './AccessibleMoveControls'
import DebugMenu from '@/game/view/debug/DebugMenu'
import { PerformanceDashboard } from '@/game/view/debug/PerformanceDashboard'
import { useDebugState } from '@/game/view/debug/useDebugState'
import './GameHeader.css'

const GameUI = memo(({ isReady }: { isReady: boolean }) => {
  const gameId = useGameId()
  const gameState = useGameState()
  const currentPlayerMoves = useCurrentPlayerMoves()
  const isMyTurn = useIsMyTurn()
  const isConnected = useIsConnected()

  const { debugState, handleDebugChange, cameraType, toggleCameraType } = useDebugState()

  return (
    <>
      <GameBoard debugState={debugState} cameraType={cameraType} canPlay={isReady} />
      {isReady && <AccessibleMoveControls />}

      <header className="game-header">
        <GameNavigation />
        {gameId && !isReady && <GameConnectionFeedback />}
        {isReady && gameState?.status !== 'completed' && <GameStatusBar />}
      </header>

      <GameResultPanel />
      <GameLobby canPlay={isReady} />

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
    </>
  )
})

export default GameUI

import { useMemo } from 'react'
import { useGameState, useIsMyTurn } from '../store/gameSelectors'
import { 
  GameLifecycle, 
  mapToGameLifecycle, 
  getGameStatusMessage, 
  getUIComponents 
} from '../types/gameLifecycle'

/**
 * Hook that provides clean game lifecycle state management
 * 
 * This abstracts away the complexity of backend state mapping and provides
 * a simple, consistent interface for UI components to use.
 */
export function useGameLifecycle() {
  const gameState = useGameState()
  const isMyTurn = useIsMyTurn()

  // Convert backend state to clean lifecycle state
  const lifecycle: GameLifecycle = useMemo(() => {
    if (!gameState) {
      return { main: 'WAITING', sub: 'JOINING' }
    }
    return mapToGameLifecycle(gameState)
  }, [gameState])

  // Calculate derived values
  const currentPlayers = gameState?.players?.length || 0
  const totalPlayers = gameState?.player_count || 2
  const readyCount = gameState?.playersReadyStatus?.filter((p: any) => p.isReady).length || 0

  // Get user-friendly status message
  const statusMessage = useMemo(() => {
    return getGameStatusMessage(lifecycle, isMyTurn, currentPlayers, totalPlayers, readyCount)
  }, [lifecycle, isMyTurn, currentPlayers, totalPlayers, readyCount])

  // Get UI component visibility
  const ui = useMemo(() => {
    return getUIComponents(lifecycle)
  }, [lifecycle])

  // Additional derived state for convenience
  const gameInfo = useMemo(() => ({
    isWaiting: lifecycle.main === 'WAITING',
    isInProgress: lifecycle.main === 'IN_PROGRESS', 
    isFinished: lifecycle.main === 'FINISHED',
    
    // Sub-state checks
    isJoining: lifecycle.main === 'WAITING' && lifecycle.sub === 'JOINING',
    isReadyCheck: lifecycle.main === 'WAITING' && lifecycle.sub === 'READY_CHECK',
    isPlacing: lifecycle.main === 'IN_PROGRESS' && lifecycle.sub === 'PLACING',
    isMoving: lifecycle.main === 'IN_PROGRESS' && lifecycle.sub === 'MOVING',
    isBuilding: lifecycle.main === 'IN_PROGRESS' && lifecycle.sub === 'BUILDING',
    
    // Player state
    currentPlayers,
    totalPlayers,
    readyCount,
    hasAllPlayers: currentPlayers >= totalPlayers,
    
    // Turn state
    isMyTurn,
    currentPlayer: gameState?.currentPlayer,
    
    // Winner info
    winner: gameState?.winner_id || gameState?.winner,
    isGameWon: !!gameState?.winner_id || !!gameState?.winner
  }), [lifecycle, currentPlayers, totalPlayers, readyCount, isMyTurn, gameState])

  return {
    lifecycle,
    statusMessage,
    ui,
    gameInfo,
    
    // Raw game state for edge cases
    rawGameState: gameState
  }
}

/**
 * Convenience hooks for specific lifecycle checks
 */
export function useIsWaiting() {
  const { gameInfo } = useGameLifecycle()
  return gameInfo.isWaiting
}

export function useIsInProgress() {
  const { gameInfo } = useGameLifecycle()
  return gameInfo.isInProgress
}

export function useIsFinished() {
  const { gameInfo } = useGameLifecycle()
  return gameInfo.isFinished
}

import { useState, useCallback } from 'react'
import { useGameState, useGameId } from '@/game/model/gameSelectors'
import { webSocketClient } from '@/game/services/WebSocketClient'
import { logError } from '@/shared/utils/log'

/**
 * Hook to manage player ready state
 * Handles the complex logic of setting ready status and syncing with server
 */
export function useReadyState() {
  const gameState = useGameState()
  const gameId = useGameId()
  
  const serverReady = gameState?.currentUserReady
  const [isReady, setIsReady] = useState(serverReady ?? false)
  const [previousServerReady, setPreviousServerReady] = useState(serverReady)
  const [isSettingReady, setIsSettingReady] = useState(false)

  // Follow the server whenever its ready state changes
  if (serverReady !== previousServerReady) {
    setPreviousServerReady(serverReady)
    if (serverReady !== undefined) {
      setIsReady(serverReady)
    }
  }

  const handleReadyToggle = useCallback(async () => {
    if (!gameId) return

    setIsSettingReady(true)
    const newReadyState = !isReady

    try {
      webSocketClient.setReady(gameId, newReadyState)

      // Optimistically update local state
      setIsReady(newReadyState)
    } catch (error) {
      logError('Failed to send ready status:', error)
    } finally {
      setIsSettingReady(false)
    }
  }, [gameId, isReady])

  return {
    isReady,
    isSettingReady,
    handleReadyToggle,
    
    // Computed values for convenience
    canToggleReady: !isSettingReady && gameId,
    readyButtonText: isSettingReady 
      ? 'Setting...' 
      : ((isReady || gameState?.currentUserReady) 
          ? 'Waiting for other players' 
          : 'Ready to Start Game'),
    isDisabled: isSettingReady || isReady || gameState?.currentUserReady
  }
}

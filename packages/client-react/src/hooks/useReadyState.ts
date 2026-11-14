import { useState, useCallback } from 'react'
import { useGameState, useGameId } from '../store/gameSelectors'
import { useApp } from '../store/AppContext'
import { webSocketClient } from '../services/WebSocketClient'

/**
 * Hook to manage player ready state
 * Handles the complex logic of setting ready status and syncing with server
 */
export function useReadyState() {
  const gameState = useGameState()
  const gameId = useGameId()
  const { state: appState } = useApp()
  
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

    console.log('🎯 Ready toggle clicked:', {
      currentReadyState: isReady,
      newReadyState: !isReady,
      gameId: gameId,
      username: appState.username
    })

    setIsSettingReady(true)
    const newReadyState = !isReady

    try {
      console.log('🎯 Sending ready status via WebSocket:', newReadyState)
      webSocketClient.setReady(gameId, newReadyState)

      // Optimistically update local state
      setIsReady(newReadyState)
      console.log('🎯 Local ready state updated to:', newReadyState)
    } catch (error) {
      console.error('🎯 Failed to send ready status:', error)
    } finally {
      setIsSettingReady(false)
    }
  }, [gameId, isReady, appState.username])

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

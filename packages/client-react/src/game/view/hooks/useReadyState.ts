import { useState, useCallback } from 'react'
import { useGameState, useGameId } from '@/game/model/gameSelectors'
import { useAppStore } from '@/user/model/appStore'
import { useToast } from '@/shared/ui/useToast'
import { webSocketClient } from '@/game/services/WebSocketClient'

/**
 * Hook to manage player ready state
 * Handles the complex logic of setting ready status and syncing with server
 */
export function useReadyState() {
  const gameState = useGameState()
  const gameId = useGameId()
  const username = useAppStore((s) => s.username)
  const { showToast } = useToast()
  
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

    console.log('Ready toggle clicked:', {
      currentReadyState: isReady,
      newReadyState: !isReady,
      gameId: gameId,
      username
    })

    setIsSettingReady(true)
    const newReadyState = !isReady

    // Optimistically update local state, and roll back when the server refuses
    setIsReady(newReadyState)
    try {
      console.log('Sending ready status via WebSocket:', newReadyState)
      await webSocketClient.setReady(gameId, newReadyState)
    } catch (error) {
      console.error('Failed to send ready status:', error)
      setIsReady(!newReadyState)
      showToast(error instanceof Error ? error.message : 'Could not change your ready status', 'error')
    } finally {
      setIsSettingReady(false)
    }
  }, [gameId, isReady, username, showToast])

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

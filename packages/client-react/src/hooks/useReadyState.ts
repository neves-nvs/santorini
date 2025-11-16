import { useState, useEffect, useCallback } from 'react'
import { useGameState, useGameId } from '../store/gameSelectors'
import { useGameStore } from '../store/gameStore'
import { useApp } from '../store/AppContext'
import { apiService } from '../services/ApiService'

/**
 * Hook to manage player ready state
 * Handles the complex logic of setting ready status and syncing with server
 */
export function useReadyState() {
  const gameState = useGameState()
  const gameId = useGameId()
  const { state: appState } = useApp()
  
  const [isReady, setIsReady] = useState(false)
  const [isSettingReady, setIsSettingReady] = useState(false)

  // Sync ready state with server when game state updates
  useEffect(() => {
    if (gameState?.game_status === 'ready' && gameState?.currentUserReady !== undefined) {
      setIsReady(gameState.currentUserReady)
    }
  }, [gameState?.game_status, gameState?.currentUserReady])

  // Initialize ready state when component mounts or game state first loads
  useEffect(() => {
    if (gameState?.currentUserReady !== undefined) {
      setIsReady(gameState.currentUserReady)
    }
  }, [gameState?.currentUserReady])

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

    console.log('🎯 Sending ready status to backend:', newReadyState)
    const success = await apiService.setPlayerReady(gameId, newReadyState)
    console.log('🎯 Backend response success:', success)

    if (success) {
      setIsReady(newReadyState)
      console.log('🎯 Local ready state updated to:', newReadyState)

      // Fallback: refresh game state after a delay in case WebSocket update doesn't arrive
      setTimeout(async () => {
        console.log('🔄 Fallback: Refreshing game state after ready status change')
        try {
          // Refresh game state to catch any changes that WebSocket missed
          if (gameId) {
            const gameResponse = await apiService.getGameState(gameId)
            if (gameResponse) {
              const { setGameState } = useGameStore.getState()
              setGameState(gameResponse)
              console.log('🔄 Game state refreshed successfully after ready change')
            }
          }
        } catch (error) {
          console.error('Failed to refresh game state after ready change:', error)
        }
      }, 3000) // Wait 3 seconds for WebSocket updates, then fallback

    } else {
      console.error('🎯 Failed to update ready status on backend')
    }
    setIsSettingReady(false)
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

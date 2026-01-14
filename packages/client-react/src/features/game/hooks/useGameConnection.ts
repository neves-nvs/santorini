import { useEffect, useRef } from 'react'
import { useApp } from '../../../store/AppContext'
import { useIsConnected, useIsConnecting } from '../store/gameSelectors'
import { webSocketClient } from '../services/WebSocketClient'

/**
 * useGameConnection - WebSocket connection lifecycle only
 *
 * This hook ONLY handles:
 * - Connecting when user is authenticated
 * - Disconnecting on logout
 *
 * It does NOT handle:
 * - Game joining (use useGameActions.joinGame)
 * - Game subscription (use useGameActions.subscribeToGame)
 * - Game state fetching (use useGameActions.fetchGameState)
 */
export function useGameConnection() {
  const { state: appState } = useApp()
  const isConnected = useIsConnected()
  const isConnecting = useIsConnecting()
  const connectionAttemptedRef = useRef(false)

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (appState.username && !isConnected && !isConnecting && !connectionAttemptedRef.current) {
      console.log('🔌 Initiating WebSocket connection for user:', appState.username)
      connectionAttemptedRef.current = true
      webSocketClient.connectAfterAuth()
    }
  }, [appState.username, isConnected, isConnecting])

  // Reset connection attempt flag when user logs out
  useEffect(() => {
    if (!appState.username) {
      connectionAttemptedRef.current = false
    }
  }, [appState.username])

  // Disconnect on unmount (logout)
  useEffect(() => {
    return () => {
      // Only disconnect if no username (logged out)
      if (!appState.username) {
        webSocketClient.disconnect()
      }
    }
  }, [appState.username])

  return {
    isConnected,
    isConnecting
  }
}

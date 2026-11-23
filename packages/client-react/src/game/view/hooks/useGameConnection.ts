import { useEffect, useRef } from 'react'
import { useAppStore } from '@/user/model/appStore'
import { useIsConnected, useIsConnecting } from '@/game/model/gameSelectors'
import {
  handleConnectionChange,
  handleConnectionStatusChange,
  handleWebSocketMessage,
  resetMessageHandlerState
} from '@/game/update/GameMessageHandler'
import { webSocketClient } from '@/game/services/WebSocketClient'

// The view joins the layers: services never import update. This module loads with the lazy game page, so the
// game code stays out of the entry bundle, and it runs before the first connect().
webSocketClient.setEvents({
  onMessage: handleWebSocketMessage,
  onConnectionChange: handleConnectionChange,
  onConnectionStatusChange: handleConnectionStatusChange,
  onReset: resetMessageHandlerState,
})

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
  const username = useAppStore((s) => s.username)
  const isConnected = useIsConnected()
  const isConnecting = useIsConnecting()
  const connectionAttemptedRef = useRef(false)

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (username && !isConnected && !isConnecting && !connectionAttemptedRef.current) {
      console.log('Initiating WebSocket connection for user:', username)
      connectionAttemptedRef.current = true
      webSocketClient.connect()
    }
  }, [username, isConnected, isConnecting])

  // Reset connection attempt flag when user logs out
  useEffect(() => {
    if (!username) {
      connectionAttemptedRef.current = false
    }
  }, [username])

  // The socket belongs to the game page: leaving it closes the socket, and the server cleans up
  useEffect(() => {
    return () => {
      connectionAttemptedRef.current = false
      webSocketClient.disconnect()
    }
  }, [])

  return {
    isConnected,
    isConnecting
  }
}

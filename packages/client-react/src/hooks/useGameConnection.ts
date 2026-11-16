import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/appStore'
import { useIsConnected, useIsConnecting } from '@/store/gameSelectors'
import { webSocketClient } from '@/services/WebSocketClient'

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

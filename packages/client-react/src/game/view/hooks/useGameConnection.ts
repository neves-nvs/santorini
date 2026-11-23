import { useEffect } from 'react'
import { useAppStore } from '@/user/model/appStore'
import { useGameStore } from '@/game/model/gameStore'
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

export function useGameConnection() {
  const username = useAppStore((s) => s.username)
  const isConnected = useGameStore((state) => state.isConnected)
  const connectionId = useGameStore((state) => state.connectionId)

  useEffect(() => {
    if (!username) return
    void webSocketClient.connect()
    return () => webSocketClient.disconnect()
  }, [username])

  return { isConnected, connectionId }
}

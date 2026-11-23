import { memo } from 'react'
import { useGameStore } from '@/game/model/gameStore'
import { webSocketClient } from '@/game/services/WebSocketClient'

const GameConnectionFeedback = memo(() => {
  const status = useGameStore((state) => state.connectionStatus)
  const attempt = useGameStore((state) => state.reconnectAttempt)
  const maxAttempts = useGameStore((state) => state.maxReconnectAttempts)

  if (status === 'failed') {
    return (
      <div className="game-connection-feedback game-connection-feedback--failed" role="alert">
        <p>Couldn’t reconnect yet. Still trying.</p>
        <button type="button" onClick={() => void webSocketClient.connect()}>
          Reconnect now
        </button>
      </div>
    )
  }

  const message = status === 'reconnecting'
    ? `Reconnecting (${attempt} of ${maxAttempts})…`
    : status === 'connected'
      ? 'Syncing game…'
      : 'Connecting to the game server…'

  return <p className="game-connection-feedback" role="status">{message}</p>
})

GameConnectionFeedback.displayName = 'GameConnectionFeedback'

export default GameConnectionFeedback

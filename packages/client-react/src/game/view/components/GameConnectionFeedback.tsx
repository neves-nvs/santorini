import { memo } from 'react'
import { useGameStore } from '@/game/model/gameStore'
import { webSocketClient } from '@/game/services/WebSocketClient'
import './GameConnectionFeedback.css'

const GameConnectionFeedback = memo(() => {
  const status = useGameStore((state) => state.connectionStatus)
  const attempt = useGameStore((state) => state.reconnectAttempt)
  const maxAttempts = useGameStore((state) => state.maxReconnectAttempts)

  if (status === 'connected' || status === 'disconnected') return null

  if (status === 'failed') {
    return (
      <div className="game-connection-feedback game-connection-feedback--failed" role="alert">
        <p>Couldn’t reconnect to the game. Automatic retries have stopped.</p>
        <button type="button" onClick={() => void webSocketClient.connect()}>
          Reconnect
        </button>
      </div>
    )
  }

  return (
    <p className="game-connection-feedback" role="status" aria-live="polite">
      {status === 'reconnecting'
        ? `Connection lost. Reconnecting (${attempt} of ${maxAttempts})…`
        : 'Connecting to the game server…'}
    </p>
  )
})

GameConnectionFeedback.displayName = 'GameConnectionFeedback'

export default GameConnectionFeedback

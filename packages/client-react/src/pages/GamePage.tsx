import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { useWebSocket } from '../hooks/useWebSocket'
import GameUI from '../components/ui/GameUI'

const GamePage = () => {
  const { gameId } = useParams<{ gameId?: string }>()
  const { state, setGameId } = useGame()
  const { subscribeToGame, isConnected } = useWebSocket()

  useEffect(() => {
    if (gameId && gameId !== state.gameId) {
      setGameId(gameId)

      // Auto-subscribe to game if we have a username and WebSocket is connected
      if (state.username && isConnected) {
        subscribeToGame(gameId, state.username)
      }
    }
  }, [gameId, state.gameId, state.username, isConnected, setGameId, subscribeToGame])

  return (
    <div className="page">
      <div className="game-container" style={{
        background: 'linear-gradient(to bottom, #87CEEB, #E0F6FF)'
      }}>
        {/* UI Overlay - GameBoard is now handled inside GameUI */}
        <div className="ui-overlay">
          <GameUI />
        </div>
      </div>
    </div>
  )
}

export default GamePage

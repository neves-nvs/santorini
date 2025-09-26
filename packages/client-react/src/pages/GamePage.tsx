import { useParams } from 'react-router-dom'
import { useGameConnection } from '../hooks/useGameConnection'
import { GameLoadingState, GameErrorState, GameMainState } from '../components/game/GamePageStates'
import GameUI from '../components/ui/GameUI'

const GamePage = () => {
  const { gameId } = useParams<{ gameId?: string }>()
  const { isLoading, error } = useGameConnection(gameId)

  if (isLoading) {
    return <GameLoadingState gameId={gameId} />
  }

  if (error) {
    return <GameErrorState error={error} />
  }

  return (
    <GameMainState>
      <GameUI />
    </GameMainState>
  )
}

export default GamePage

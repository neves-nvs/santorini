import { useParams } from 'react-router-dom'
import { useGameSetup } from '../hooks/useGameSetup'
import { GameLoadingState, GameErrorState, GameMainState } from '../components/game/GamePageStates'
import GameUI from '../components/ui/GameUI'

const GamePage = () => {
  const { gameId } = useParams<{ gameId?: string }>()
  const { isLoading, error } = useGameSetup(gameId)

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

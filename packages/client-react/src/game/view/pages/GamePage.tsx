import { useParams } from 'react-router-dom'
import { useGameSetup } from '@/game/view/hooks/useGameSetup'
import { GameErrorState, GameMainState } from '@/game/view/components/GamePageStates'
import GameConnectionFeedback from '@/game/view/components/GameConnectionFeedback'
import GameUI from '@/game/view/components/GameUI'
import { usePageTitle } from '@/shared/utils/usePageTitle'

const GamePage = () => {
  const { gameId } = useParams<{ gameId?: string }>()
  const { error } = useGameSetup(gameId)
  usePageTitle(gameId ? `Game ${gameId}` : 'Game')

  return (
    <>
      {error ? (
        <GameErrorState error={error} />
      ) : (
        <GameMainState>
          <GameUI />
        </GameMainState>
      )}
      <GameConnectionFeedback />
    </>
  )
}

export default GamePage

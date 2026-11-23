import { useParams } from 'react-router-dom'
import { useGameSetup } from '@/game/view/hooks/useGameSetup'
import { GameErrorState, GameMainState } from '@/game/view/components/GamePageStates'
import GameUI from '@/game/view/components/GameUI'
import { usePageTitle } from '@/shared/utils/usePageTitle'

const GamePage = () => {
  const { gameId } = useParams<{ gameId?: string }>()
  const { error, isReady } = useGameSetup(gameId)
  usePageTitle(gameId ? `Game ${gameId}` : 'Game')

  if (error) return <GameErrorState error={error} />

  return (
    <GameMainState>
      <GameUI isReady={isReady} />
    </GameMainState>
  )
}

export default GamePage

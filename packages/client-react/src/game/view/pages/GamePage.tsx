import { useParams } from 'react-router-dom'
import { useGameSetup } from '@/game/view/hooks/useGameSetup'
import { useKeyboardPlayNotice } from '@/game/view/hooks/useKeyboardPlayNotice'
import { GameLoadingState, GameErrorState, GameMainState } from '@/game/view/components/GamePageStates'
import GameUI from '@/game/view/components/GameUI'
import { usePageTitle } from '@/shared/utils/usePageTitle'

const GamePage = () => {
  const { gameId } = useParams<{ gameId?: string }>()
  const { isLoading, error } = useGameSetup(gameId)
  usePageTitle(gameId ? `Game ${gameId}` : 'Game')
  useKeyboardPlayNotice()

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

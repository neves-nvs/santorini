import { memo } from 'react'
import { Link } from 'react-router-dom'
import { useGameState } from '@/game/model/gameSelectors'
import { useAppStore } from '@/user/model/appStore'
import { useGameLifecycle } from '@/game/view/hooks/useGameLifecycle'
import './GameResultPanel.css'

const GameResultPanel = memo(() => {
  const gameState = useGameState()
  const currentUserId = useAppStore((state) => state.userId)
  const { ui } = useGameLifecycle()

  if (!ui.showGameResults || !gameState) return null

  const winner = gameState.players.find((player) => player.userId === gameState.winnerUserId)
  const winnerSeat = winner ? gameState.players.indexOf(winner) : -1
  const didCurrentUserWin = gameState.winnerUserId === currentUserId
  const title = didCurrentUserWin
    ? 'You won!'
    : winnerSeat >= 0
      ? `Player ${winnerSeat + 1} won`
      : 'Game complete'
  const description = gameState.winReason === 'opponent_trapped'
    ? 'The other player had no legal moves.'
    : gameState.winReason === 'win_condition'
      ? 'A worker reached the third level.'
      : 'The game has ended.'

  return (
    <div className="game-result-scrim">
      <section className="game-result-panel" role="status" aria-live="polite" aria-atomic="true">
        <span className="game-result-mark" aria-hidden="true">
          {didCurrentUserWin ? (
            <img className="game-result-icon game-result-star" src="/icons/star.svg" alt="" />
          ) : (
            <img className="game-result-icon" src="/icons/check.svg" alt="" />
          )}
        </span>
        <p className="game-result-eyebrow">Game complete</p>
        <h2 className="game-result-title">{title}</h2>
        <p className="game-result-description">{description}</p>
        <div className="game-result-actions">
          <Link to="/lobby" className="game-result-primary">Find another game</Link>
          <Link to="/" className="game-result-secondary">Home</Link>
        </div>
      </section>
    </div>
  )
})

GameResultPanel.displayName = 'GameResultPanel'

export default GameResultPanel

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
            <svg className="game-result-star" viewBox="0 0 24 24" focusable="false">
              <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="m5 12.5 4.2 4.2L19 7" />
            </svg>
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

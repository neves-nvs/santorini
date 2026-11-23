import { useRef, useState } from 'react'
import { WS_MESSAGE_TYPES } from '@santorini/shared'
import type { MoveCommand } from '@santorini/shared'
import { useCurrentPlayerMoves, useGameId, useGameState, useIsMyTurn } from '@/game/model/gameSelectors'
import { webSocketClient } from '@/game/services/WebSocketClient'
import type { AvailableMove, BuildPosition } from '@/game/model/game'
import './AccessibleMoveControls.css'

const moveLabels: Record<AvailableMove['type'], string> = {
  place_worker: 'Place worker',
  move_worker: 'Move worker',
  build_block: 'Build a block',
  build_dome: 'Build a dome'
}

const formatPosition = ({ x, y }: BuildPosition) => `${String.fromCharCode(65 + y)}${x + 1}`

function toMoveCommand(move: AvailableMove, position: BuildPosition): MoveCommand {
  if (move.type === 'move_worker') {
    if (!move.fromPosition) throw new Error('The worker position is unavailable. Wait for the board to update.')
    return { type: move.type, workerId: move.workerId, fromPosition: move.fromPosition, position }
  }

  if (move.type === 'place_worker') {
    return { type: move.type, workerId: move.workerId, position }
  }

  return { type: move.type, position }
}

const AccessibleMoveControls = () => {
  const moves = useCurrentPlayerMoves()
  const gameId = useGameId()
  const gameState = useGameState()
  const isMyTurn = useIsMyTurn()
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)

  if (gameState?.status !== 'in-progress') return null

  const submitMove = async (move: AvailableMove, position: BuildPosition) => {
    if (!gameId || pending) return

    setPending(true)
    setFeedback('')
    try {
      await webSocketClient.request(WS_MESSAGE_TYPES.MAKE_MOVE, {
        gameId: Number(gameId),
        move: toMoveCommand(move, position)
      })
      setFeedback(`${moveLabels[move.type]} at ${formatPosition(position)} sent. Waiting for the board to update.`)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'The move could not be sent. Please try again.')
    } finally {
      setPending(false)
      headingRef.current?.focus()
    }
  }

  return (
    <section className="accessible-move-controls" aria-label="Keyboard game controls">
      <details>
        <summary>Keyboard game controls</summary>
        <div className="accessible-move-controls__panel">
          <h2 ref={headingRef} tabIndex={-1}>Choose a game action</h2>
          <p className="accessible-move-controls__instructions" id="move-control-instructions">
            {isMyTurn
              ? `Your turn${gameState.phase ? `: ${gameState.phase.replace(/_/g, ' ')}` : ''}. Choose an available action.`
              : 'Actions become available here when it is your turn.'}
          </p>
          {isMyTurn && moves.length > 0 ? (
            <div className="accessible-move-controls__groups" aria-describedby="move-control-instructions">
              {moves.map((move) => (
                <fieldset key={`${move.type}-${move.workerId}`} disabled={pending}>
                  <legend>{moveLabels[move.type]}{move.type === 'place_worker' ? '' : ` · worker ${move.workerId}`}</legend>
                  <div className="accessible-move-controls__positions">
                    {move.validPositions.map((position) => {
                      const cell = formatPosition(position)
                      return (
                        <button
                          type="button"
                          key={`${move.type}-${move.workerId}-${position.x}-${position.y}`}
                          onClick={() => void submitMove(move, position)}
                          aria-label={`${moveLabels[move.type]}${move.type === 'place_worker' ? '' : ` with worker ${move.workerId}`} at ${cell}`}
                        >
                          {cell}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          ) : (
            <p>{isMyTurn ? 'No available actions. The game state may be updating.' : 'Waiting for your turn.'}</p>
          )}
          <details className="accessible-move-controls__board">
            <summary>Read the current board</summary>
            <table>
              <caption>Board squares, tower heights, domes, and workers</caption>
              <tbody>
                {gameState.board.cells.map((row, x) => (
                  <tr key={x}>
                    {row.map((cell, y) => {
                      const position = formatPosition({ x, y })
                      const worker = cell.worker
                        ? `, Player ${cell.worker.seat + 1} worker ${cell.worker.workerId}`
                        : ''
                      const dome = cell.hasDome ? ', dome' : ''
                      return (
                        <td key={position}>
                          {position}: level {cell.height}{dome}{worker}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
          <p className="accessible-move-controls__feedback" role="status" aria-live="polite">
            {pending ? 'Sending move…' : feedback}
          </p>
        </div>
      </details>
    </section>
  )
}

export default AccessibleMoveControls

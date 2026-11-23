import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AccessibleMoveControls from '@/game/view/components/AccessibleMoveControls'
import { useGameStore } from '@/game/model/gameStore'
import { webSocketClient } from '@/game/services/WebSocketClient'
import type { GameState } from '@/game/model/game'

const board = {
  cells: Array.from({ length: 5 }, (_, x) => Array.from({ length: 5 }, (_, y) => ({
    height: x === 0 && y === 0 ? 2 : 0,
    hasDome: x === 0 && y === 0,
    worker: x === 0 && y === 0 ? { seat: 1, workerId: 2 } : null,
  }))),
}

const gameState = (version: number, phase: string) => ({
  status: 'in-progress',
  phase,
  version,
  board,
} as GameState)

describe('AccessibleMoveControls', () => {
  beforeEach(() => {
    useGameStore.setState({
      gameId: '7',
      gameState: gameState(1, 'moving'),
      currentPlayerMoves: [{
        type: 'move_worker', workerId: 1, fromPosition: { x: 1, y: 1 }, validPositions: [{ x: 2, y: 1 }],
      }],
      isMyTurn: true,
    })
    vi.spyOn(webSocketClient, 'request').mockResolvedValue({} as never)
  })

  it('describes board occupants and returns focus to the action heading after move and build', async () => {
    render(<AccessibleMoveControls />)
    fireEvent.click(screen.getByText('Keyboard game controls'))

    fireEvent.click(screen.getByText('Read the current board'))
    expect(screen.getByText('A1: level 2, dome, Player 2 worker 2')).toBeInTheDocument()

    const heading = screen.getByRole('heading', { name: 'Choose a game action' })
    const moveButton = screen.getByRole('button', { name: 'Move worker with worker 1 at B3' })
    moveButton.focus()
    fireEvent.keyDown(moveButton, { key: 'Enter' })
    fireEvent.click(moveButton)
    await waitFor(() => expect(heading).toHaveFocus())

    act(() => {
      useGameStore.setState({
        gameState: gameState(2, 'building'),
        currentPlayerMoves: [{
          type: 'build_block', workerId: 1, validPositions: [{ x: 2, y: 2 }],
        }],
      })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Build a block at C3' }))
    await waitFor(() => expect(heading).toHaveFocus())
  })
})

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AccessibleMoveControls from '@/game/view/components/AccessibleMoveControls'
import { webSocketClient } from '@/game/services/WebSocketClient'
import type { GameState } from '@/game/model/game'

const selectors = vi.hoisted(() => ({
  useCurrentPlayerMoves: vi.fn(),
  useGameId: vi.fn(),
  useGameState: vi.fn(),
  useIsMyTurn: vi.fn(),
}))
vi.mock('@/game/model/gameSelectors', () => selectors)

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
    selectors.useGameId.mockReturnValue('7')
    selectors.useGameState.mockReturnValue(gameState(1, 'moving'))
    selectors.useCurrentPlayerMoves.mockReturnValue([{
      type: 'move_worker', workerId: 1, fromPosition: { x: 1, y: 1 }, validPositions: [{ x: 2, y: 1 }],
    }])
    selectors.useIsMyTurn.mockReturnValue(true)
    vi.spyOn(webSocketClient, 'request').mockResolvedValue({} as never)
  })

  it('describes board occupants and returns focus to the action heading after move and build', async () => {
    const { rerender } = render(<AccessibleMoveControls />)
    fireEvent.click(screen.getByText('Keyboard game controls'))

    fireEvent.click(screen.getByText('Read the current board'))
    expect(screen.getByText('A1: level 2, dome, Player 2 worker 2')).toBeInTheDocument()

    const heading = screen.getByRole('heading', { name: 'Choose a game action' })
    const moveButton = screen.getByRole('button', { name: 'Move worker with worker 1 at B3' })
    moveButton.focus()
    fireEvent.keyDown(moveButton, { key: 'Enter' })
    fireEvent.click(moveButton)
    await waitFor(() => expect(heading).toHaveFocus())

    selectors.useGameState.mockReturnValue(gameState(2, 'building'))
    selectors.useCurrentPlayerMoves.mockReturnValue([{
      type: 'build_block', workerId: 1, validPositions: [{ x: 2, y: 2 }],
    }])
    act(() => rerender(<AccessibleMoveControls />))

    fireEvent.click(screen.getByRole('button', { name: 'Build a block with worker 1 at C3' }))
    await waitFor(() => expect(heading).toHaveFocus())
  })
})

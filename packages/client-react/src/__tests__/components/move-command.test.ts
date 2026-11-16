import { describe, expect, it } from 'vitest'
import { toMoveCommand } from '@/components/game/move-command'
import type { AvailableMove } from '@/types/game'

const target = { x: 2, y: 3 }

describe('toMoveCommand', () => {
  it('places a worker with its id', () => {
    const move: AvailableMove = { type: 'place_worker', workerId: 4, validPositions: [target] }

    expect(toMoveCommand(move, target)).toEqual({ type: 'place_worker', workerId: 4, position: target })
  })

  it('moves a worker from where it stands', () => {
    const move: AvailableMove = { type: 'move_worker', workerId: 4, fromPosition: { x: 0, y: 0 }, validPositions: [target] }

    expect(toMoveCommand(move, target)).toEqual({ type: 'move_worker', workerId: 4, fromPosition: { x: 0, y: 0 }, position: target })
  })

  it.each(['build_block', 'build_dome'] as const)('%s names the square and no worker', (type) => {
    const move: AvailableMove = { type, workerId: 4, validPositions: [target] }

    expect(toMoveCommand(move, target)).toEqual({ type, position: target })
  })
})

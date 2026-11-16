import { describe, expect, it } from 'vitest'
import { validPositionsFor } from '@/game/model/validPositions'
import type { AvailableMove } from '@/game/model/game'

const placement: AvailableMove = { type: 'place_worker', workerId: 0, validPositions: [{ x: 0, y: 0 }, { x: 2, y: 3 }] }
const moveOfFirst: AvailableMove = { type: 'move_worker', workerId: 1, fromPosition: { x: 1, y: 1 }, validPositions: [{ x: 1, y: 2 }] }
const moveOfSecond: AvailableMove = { type: 'move_worker', workerId: 2, fromPosition: { x: 4, y: 4 }, validPositions: [{ x: 3, y: 3 }] }
const buildOfFirst: AvailableMove = { type: 'build_block', workerId: 1, validPositions: [{ x: 0, y: 1 }] }

describe('validPositionsFor', () => {
  it('marks every square for placing a worker without a selection', () => {
    expect(validPositionsFor([placement], undefined)).toEqual([
      { x: 0, y: 0, workerId: 0, type: 'place_worker' },
      { x: 2, y: 3, workerId: 0, type: 'place_worker' },
    ])
  })

  it('marks nothing for moving or building until a worker is selected', () => {
    expect(validPositionsFor([moveOfFirst, buildOfFirst], undefined)).toEqual([])
  })

  it('marks the moves and builds of the selected worker only', () => {
    expect(validPositionsFor([moveOfFirst, moveOfSecond, buildOfFirst], 1)).toEqual([
      { x: 1, y: 2, workerId: 1, type: 'move_worker' },
      { x: 0, y: 1, workerId: 1, type: 'build_block' },
    ])
  })

  it('has nothing to mark without moves', () => {
    expect(validPositionsFor([], 1)).toEqual([])
  })
})

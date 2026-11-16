import type { AvailableMove } from './game'

export interface ValidPosition {
  x: number
  y: number
  workerId: number
  type: AvailableMove['type']
}

/**
 * The squares the board marks as playable. Placing a worker needs no selection; moving and building show
 * only the squares of the selected worker, so the player clicks a worker first.
 */
export function validPositionsFor(moves: AvailableMove[], selectedWorkerId: number | undefined): ValidPosition[] {
  return moves
    .filter((move) => move.type === 'place_worker' || (selectedWorkerId !== undefined && move.workerId === selectedWorkerId))
    .flatMap((move) => move.validPositions.map(({ x, y }) => ({ x, y, workerId: move.workerId, type: move.type })))
}

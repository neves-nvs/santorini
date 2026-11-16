import type { MoveCommand, Position } from '@santorini/shared'
import type { AvailableMove } from '@/types/game'

export function toMoveCommand(move: AvailableMove, position: Position): MoveCommand {
  switch (move.type) {
    case 'place_worker':
      return { type: move.type, workerId: move.workerId, position }
    case 'move_worker':
      return { type: move.type, workerId: move.workerId, fromPosition: move.fromPosition, position }
    case 'build_block':
    case 'build_dome':
      return { type: move.type, position }
  }
}

export type { BoardView, Move, PlayerGameView, PlayerView } from '@santorini/shared'

import type { Move, PlayerGameView, Position } from '@santorini/shared'

export interface BuildPosition extends Position {
  buildingLevel?: number
  buildingType?: string
  moveType?: 'build_block' | 'build_dome'
  serverMoveObject?: Move
}

/** What the store keeps of a game: the view the server sent, plus what the client works out from it. */
export type GameState = PlayerGameView & { currentUserReady?: boolean }

interface MoveOptions<T extends Move['type']> {
  type: T
  workerId: number
  validPositions: Position[]
}

/** The server's moves, grouped by type and worker so the board can show every square one worker can reach. */
export type AvailableMove =
  | MoveOptions<'place_worker' | 'build_block' | 'build_dome'>
  | (MoveOptions<'move_worker'> & { fromPosition: Position })

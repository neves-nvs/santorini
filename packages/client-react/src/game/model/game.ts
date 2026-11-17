export type {
  BoardView,
  PlayerView,
  Move,
  GameView
} from '@santorini/shared';

import type {
  Position,
  BoardView,
  PlayerView,
  GameStatus,
  GamePhase,
  Move
} from '@santorini/shared';

// ============================================================================
// Extended Frontend Types
// ============================================================================

export interface BuildPosition extends Position {
  buildingType?: string;
  moveType?: 'build_block' | 'build_dome';
  serverMoveObject?: Move;
}

interface PlayerReadyStatus {
  userId: number;
  isReady: boolean;
}

/**
 * Client-side game state that combines server view with local state
 */
export interface GameState {
  // Core fields from GameView
  gameId: number;
  status: GameStatus;
  phase: GamePhase;
  currentPlayerId: number | null;
  turnNumber: number;
  version: number;
  board: BoardView;
  players: PlayerView[];
  availableMoves?: Move[];
  winnerId?: number;
  winReason?: string;
  isCurrentPlayer: boolean;

  // Legacy fields for backwards compatibility during migration
  id?: string;
  currentPlayer?: string;

  // Ready status fields
  currentUserReady?: boolean;
  playersReadyStatus?: PlayerReadyStatus[];
  readyCount?: number;
  totalPlayers?: number;

  // Turn state tracking
  isMyTurn?: boolean;
}

// Available move format for UI (transformed from server moves)
export interface AvailableMove {
  type: 'place_worker' | 'move_worker' | 'build_block' | 'build_dome';
  workerId: number;
  validPositions: (Position | BuildPosition)[];
  // For move_worker moves: the worker's current position (where they're moving FROM)
  fromPosition?: Position;
}

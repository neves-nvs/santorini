// Re-export shared types
export type {
  Position,
  WorkerRef,
  CellView,
  BoardView,
  PlayerStatus,
  PlayerView,
  GameStatus,
  GamePhase,
  PlaceWorkerMove,
  MoveWorkerMove,
  BuildMove,
  Move,
  PlayerGameView,
  SpectatorGameView,
  GameStateUpdatePayload,
  GameEndPayload,
  GameStartPayload
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
  buildingLevel?: number;
  buildingType?: string;
  moveType?: 'build_block' | 'build_dome';
  serverMoveObject?: Move;
}

export type BlockType = 'BASE' | 'MID' | 'TOP' | 'DOME';
export type PieceType = BlockType | 'WORKER';

export interface GamePiece {
  type: PieceType;
  position: Position;
  playerId?: string;
}

export interface PlayerReadyStatus {
  userId: number;
  isReady: boolean;
}

// Games list from API
export interface GameInfo {
  id: number;
  creatorId: number;
  maxPlayers: number;
  status: GameStatus;
  phase: GamePhase;
  currentPlayerId: number | null;
  turnNumber: number;
  version: number;
  playerCount: number;
  players: PlayerView[];
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

/**
 * Client-side game state that combines server view with local state
 */
export interface GameState {
  // Core fields from PlayerGameView
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

// WebSocket message wrapper
export interface WebSocketMessage {
  type: string;
  payload: unknown;
}

export interface AvailablePlay {
  type: string;
  position?: Position;
  from?: Position;
  to?: Position;
}

/**
 * Shared Game Types
 * 
 * Type definitions for game state views shared between frontend and backend.
 * These types define the structure of data sent over WebSocket.
 */

// ============================================================================
// Position and Board Types
// ============================================================================

export interface Position {
  x: number;
  y: number;
}

export interface WorkerRef {
  playerId: number;
  workerId: number;
}

export interface CellView {
  height: number;
  hasDome: boolean;
  worker: WorkerRef | null;
}

export interface BoardView {
  cells: CellView[][];
}

// ============================================================================
// Player Types
// ============================================================================

export type PlayerStatus = 'active' | 'disconnected' | 'blocked' | 'eliminated';

export interface PlayerView {
  id: number;
  userId: number;
  seat: number;
  status: PlayerStatus;
  isReady: boolean;
}

// ============================================================================
// Game State Types
// ============================================================================

export type GameStatus = 'waiting' | 'in-progress' | 'completed';
export type GamePhase = 'placing' | 'moving' | 'building' | null;

// ============================================================================
// Move Types
// ============================================================================

export interface PlaceWorkerMove {
  type: 'place_worker';
  workerId: number;
  position: Position;
}

export interface MoveWorkerMove {
  type: 'move_worker';
  workerId: number;
  fromPosition: Position;
  position: Position;
}

export interface BuildMove {
  type: 'build_block' | 'build_dome';
  workerId: number;
  position: Position;
}

export type Move = PlaceWorkerMove | MoveWorkerMove | BuildMove;

// ============================================================================
// Move Commands (client -> server)
// ============================================================================

/**
 * What a client sends to make a move. The server takes the player from the authenticated user and looks
 * at nothing but the fields below, so a command is looser than the Move it becomes: `workerId` may be left
 * out (the server falls back to 0) and a build names no worker.
 */
export interface PlaceWorkerCommand {
  type: 'place_worker';
  position: Position;
  workerId?: number;
}

export interface MoveWorkerCommand {
  type: 'move_worker';
  position: Position;
  fromPosition: Position;
  workerId?: number;
}

export interface BuildCommand {
  type: 'build_block' | 'build_dome';
  position: Position;
  buildingLevel?: number;
}

export type MoveCommand = PlaceWorkerCommand | MoveWorkerCommand | BuildCommand;

// ============================================================================
// Game View Types (sent to clients)
// ============================================================================

/**
 * Game state view for a specific player
 * Includes available moves if it's the player's turn
 */
export interface PlayerGameView {
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
}

/**
 * Game state view for spectators
 * No available moves included
 */
export interface SpectatorGameView {
  gameId: number;
  status: GameStatus;
  phase: GamePhase;
  currentPlayerId: number | null;
  turnNumber: number;
  version: number;
  board: BoardView;
  players: PlayerView[];
  winnerId?: number | null;
  winReason?: string | null;
}

// ============================================================================
// WebSocket Payload Types
// ============================================================================

/**
 * Payload structure for game_state_update messages
 */
export interface GameStateUpdatePayload {
  gameId: number;
  version: number;
  state: PlayerGameView | SpectatorGameView;
}

/**
 * Payload for game end notifications
 */
export interface GameEndPayload {
  gameId: number;
  version: number;
  status: GameStatus;
  winnerId: number | null;
  winReason: string | null;
  finishedAt: Date | null;
}

/**
 * Payload for game start notifications. `availableMoves` is only sent to the player who moves first.
 */
export interface GameStartPayload {
  gameId: number;
  activePlayerId: number | null;
  availableMoves?: Move[];
}

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
export type ActivePhase = Exclude<GamePhase, null>;

export const WIN_REASONS = ['win_condition', 'opponent_trapped'] as const;
export type WinReason = (typeof WIN_REASONS)[number];

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
}

export type MoveCommand = PlaceWorkerCommand | MoveWorkerCommand | BuildCommand;

// ============================================================================
// Game View Types (sent to clients)
// ============================================================================

/**
 * Who is looking. A player gets the moves they can play now; someone watching, or whose seat was freed, gets none.
 */
export type Viewer =
  | { role: 'player'; playerId: number; isCurrentPlayer: boolean; availableMoves: Move[] }
  | { role: 'spectator' };

interface GameViewBase {
  gameId: number;
  maxPlayers: number;
  turnNumber: number;
  version: number;
  board: BoardView;
  players: PlayerView[];
  viewer: Viewer;
}

export interface WaitingGameView extends GameViewBase {
  status: 'waiting';
  phase: null;
  currentPlayerId: null;
  winnerPlayerId: null;
  winReason: null;
}

export interface InProgressGameView extends GameViewBase {
  status: 'in-progress';
  phase: ActivePhase;
  currentPlayerId: number;
  winnerPlayerId: null;
  winReason: null;
}

export interface CompletedGameView extends GameViewBase {
  status: 'completed';
  phase: null;
  currentPlayerId: null;
  winnerPlayerId: number;
  winReason: WinReason;
}

/**
 * A game as one user sees it. The server sends it as the payload of every `game_state` and as the body of
 * `GET /games/:gameId`. `status` decides which of the other fields are set: a game that has not started has no
 * phase, current player or winner, a game in progress has a phase and a current player, and a finished one has
 * a winner and the reason, and nobody to move. `currentPlayerId` and `winnerPlayerId` are per-game player ids,
 * not user ids.
 */
export type GameView = WaitingGameView | InProgressGameView | CompletedGameView;

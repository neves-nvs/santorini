/**
 * Shared Game Types
 * 
 * Type definitions for game state views shared between frontend and backend.
 * These types define the structure of data sent over WebSocket.
 */

import type { GamePhase as ActivePhase, GameStatus, PlayerStatus, Position, WinReason } from '@santorini/engine';

// What the engine defines comes from the engine.
export type { ActivePhase, GameStatus, PlayerStatus, Position, WinReason };

// ============================================================================
// Position and Board Types
// ============================================================================

/** `seat` is the position of the owner in `GameView.players`. */
export interface WorkerRef {
  seat: number;
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

/** A player has no seat field: the position in `GameView.players` is the seat, counted from 0. */
export interface PlayerView {
  userId: number;
  status: PlayerStatus;
  isReady: boolean;
}

// ============================================================================
// Game State Types
// ============================================================================

/** On the wire a game that is not in progress has no phase. */
export type GamePhase = ActivePhase | null;

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
  | { role: 'player'; isCurrentPlayer: boolean; availableMoves: Move[] }
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
  currentSeat: null;
  winnerUserId: null;
  winReason: null;
}

export interface InProgressGameView extends GameViewBase {
  status: 'in-progress';
  phase: ActivePhase;
  currentSeat: number;
  winnerUserId: null;
  winReason: null;
}

export interface CompletedGameView extends GameViewBase {
  status: 'completed';
  phase: null;
  currentSeat: null;
  winnerUserId: number;
  winReason: WinReason;
}

/**
 * A game as one user sees it. The server sends it as the payload of every `game_state` and as the body of
 * `GET /games/:gameId`. `status` decides which of the other fields are set: a game that has not started has no
 * phase, current player or winner, a game in progress has a phase and a current player, and a finished one has
 * a winner and the reason, and nobody to move. `currentSeat` is a position in `players`, counted from 0, and
 * `winnerUserId` is the user who won.
 */
export type GameView = WaitingGameView | InProgressGameView | CompletedGameView;

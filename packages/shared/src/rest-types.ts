import type { GamePhase, GameStatus, PlayerView } from './game-types.ts';
import type { WireError } from './websocket-types.ts';

// ============================================================================
// Errors
// ============================================================================

/** The body of a success that only carries a message, such as the answer to a logout. */
export interface MessageResponse {
  message: string;
}

/** The error body of every route: the same `{ code, message, details? }` as a WebSocket `error`. */
export interface ErrorResponse {
  error: WireError;
}

/** Some routes answer with a bare string instead of JSON (`POST /session` answers `OK`). */
export type TextResponse = string;

// ============================================================================
// Session
// ============================================================================

export type LogoutResponse = MessageResponse;

/** `GET /me` */
export interface CurrentUserResponse {
  id: number;
  username: string;
}

/** `POST /ws-ticket` */
export interface WebSocketTicketResponse {
  ticket: string;
}

// ============================================================================
// Users
// ============================================================================

export interface UserView {
  id: number;
  username: string;
  displayName: string;
  createdAt: string;
}

// ============================================================================
// Games
// ============================================================================

export interface CreateGameRequest {
  /** An integer from 2 to 4. The server uses 2 when this is left out. */
  maxPlayers?: number;
}

export interface CreateGameResponse {
  gameId: number;
}

/** One entry of `GET /games` and `GET /games/my`. */
export interface GameSummary {
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

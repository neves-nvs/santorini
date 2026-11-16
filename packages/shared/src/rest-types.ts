import type { GamePhase, GameStatus, PlayerView } from './game-types.ts';
import type { ErrorCode } from './protocol.ts';

// ============================================================================
// Errors
// ============================================================================

/** The error body of the session, user and middleware routes. */
export interface MessageResponse {
  message: string;
}

/** The error body of the games routes: the same `{ code, message }` as a WebSocket `error`. */
export interface GameErrorResponse {
  error: { code: ErrorCode; message: string };
}

export interface ValidationFieldError {
  type: string;
  msg: string;
  path?: string;
  location?: string;
}

/** A 400 from a request body that failed validation. */
export interface ValidationErrorResponse {
  errors: ValidationFieldError[];
}

/** Some routes answer with a bare string instead of JSON (`POST /session` answers `OK`). */
export type TextResponse = string;

// ============================================================================
// Session
// ============================================================================

export interface LoginRequest {
  username: string;
  password: string;
}

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

export interface CreateUserRequest {
  username: string;
  password: string;
}

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

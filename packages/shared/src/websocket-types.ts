/**
 * WebSocket messages between the client and the server.
 *
 * A client sends a command, `{ type, id?, payload }`. The server answers it with exactly one `ok` or `error`
 * that carries the same `id`. Everything else the server sends is an event about a game (no `id`).
 */

import type { GameView, MoveCommand } from './game-types.ts';
import type { ErrorCode } from './protocol.ts';

export const WS_MESSAGE_TYPES = {
  // Client -> Server
  SUBSCRIBE_GAME: 'subscribe_game',
  JOIN_GAME: 'join_game',
  MAKE_MOVE: 'make_move',
  SET_READY: 'set_ready',
  LEAVE_GAME: 'leave_game',

  // Server -> Client
  OK: 'ok',
  ERROR: 'error',
  GAME_STATE: 'game_state'
} as const;

// ============================================================================
// Client -> Server
// ============================================================================

interface Command<Type extends string, Payload> {
  type: Type;
  id?: string;
  payload: Payload;
}

export type ClientMessage =
  | Command<typeof WS_MESSAGE_TYPES.JOIN_GAME, { gameId: number }>
  | Command<typeof WS_MESSAGE_TYPES.LEAVE_GAME, { gameId: number }>
  | Command<typeof WS_MESSAGE_TYPES.SUBSCRIBE_GAME, { gameId: number }>
  | Command<typeof WS_MESSAGE_TYPES.SET_READY, { gameId: number; isReady: boolean }>
  | Command<typeof WS_MESSAGE_TYPES.MAKE_MOVE, { gameId: number; move: MoveCommand }>;

// ============================================================================
// Server -> Client
// ============================================================================

export interface WireError {
  code: ErrorCode;
  message: string;
  details?: { issues: { path: string[]; message: string }[] };
}

/** The result of a command. Every command answers with the `gameId` it acted on, except `set_ready` and `make_move`. */
export interface OkMessage {
  type: typeof WS_MESSAGE_TYPES.OK;
  id?: string;
  payload: { gameId: number } | Record<string, never>;
}

export interface ErrorMessage {
  type: typeof WS_MESSAGE_TYPES.ERROR;
  id?: string;
  payload: WireError;
}

/**
 * The game as this user sees it. Sent to every subscribed socket after every change to the game (a join, a leave,
 * a ready, a move), and when a socket subscribes. A finished game is a state with status `completed`.
 */
export interface GameStateMessage {
  type: typeof WS_MESSAGE_TYPES.GAME_STATE;
  payload: GameView;
}

export type ServerMessage = OkMessage | ErrorMessage | GameStateMessage;

export type ServerMessageType = ServerMessage['type'];

export type ServerMessageOf<K extends ServerMessageType> = Extract<ServerMessage, { type: K }>;

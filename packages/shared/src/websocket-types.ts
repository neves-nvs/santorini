/**
 * Shared WebSocket Message Types
 * 
 * This file defines all WebSocket message types used between frontend and backend
 * to ensure type safety and prevent message type mismatches.
 */

import type { GameStateUpdatePayload, GameStatus, MoveCommand, PlayerGameView } from './game-types.ts';

// ============================================================================
// Message Type Constants (eliminates magic strings)
// ============================================================================

export const WS_MESSAGE_TYPES = {
  // Client -> Server
  SUBSCRIBE_GAME: 'subscribe_game',
  JOIN_GAME: 'join_game',
  MAKE_MOVE: 'make_move',
  SET_READY: 'set_ready',
  CREATE_GAME: 'create_game',
  LIST_GAMES: 'list_games',
  LEAVE_GAME: 'leave_game',

  // Server -> Client
  GAME_STATE_UPDATE: 'game_state_update',
  READY_STATUS_UPDATE: 'ready_status_update',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  GAME_CREATED: 'game_created',
  GAME_JOINED: 'game_joined',
  GAMES_LIST: 'games_list',
  GAME_LEFT: 'game_left',
  ERROR: 'error'
} as const;

export type WSMessageType = typeof WS_MESSAGE_TYPES[keyof typeof WS_MESSAGE_TYPES];

// ============================================================================
// Client -> Server Messages
// ============================================================================

export interface CreateGameMessage {
  type: typeof WS_MESSAGE_TYPES.CREATE_GAME;
  payload?: {
    maxPlayers?: number;
  };
}

export interface JoinGameMessage {
  type: typeof WS_MESSAGE_TYPES.JOIN_GAME;
  payload: {
    gameId: number;
  };
}

export interface ListGamesMessage {
  type: typeof WS_MESSAGE_TYPES.LIST_GAMES;
  payload?: Record<string, never>;
}

export interface LeaveGameMessage {
  type: typeof WS_MESSAGE_TYPES.LEAVE_GAME;
  payload: {
    gameId: number;
  };
}

export interface SubscribeGameMessage {
  type: typeof WS_MESSAGE_TYPES.SUBSCRIBE_GAME;
  payload: {
    gameId: number;
  };
}

export interface SetReadyMessage {
  type: typeof WS_MESSAGE_TYPES.SET_READY;
  payload: {
    gameId: number;
    isReady: boolean;
  };
}

export interface MakeMoveMessage {
  type: typeof WS_MESSAGE_TYPES.MAKE_MOVE;
  payload: {
    gameId: number;
    move: MoveCommand;
  };
}

// ============================================================================
// Server -> Client Messages
// ============================================================================

export interface GameCreatedMessage {
  type: typeof WS_MESSAGE_TYPES.GAME_CREATED;
  payload: {
    gameId: number;
    gameState: PlayerGameView;
  };
}

export interface GameJoinedMessage {
  type: typeof WS_MESSAGE_TYPES.GAME_JOINED;
  payload: {
    gameId: number;
    gameState: PlayerGameView;
  };
}

export interface GameSummaryView {
  id: number;
  status: GameStatus;
  playerCount: number;
  maxPlayers: number;
  createdAt: string;
}

export interface GamesListMessage {
  type: typeof WS_MESSAGE_TYPES.GAMES_LIST;
  payload: {
    games: GameSummaryView[];
  };
}

export interface GameLeftMessage {
  type: typeof WS_MESSAGE_TYPES.GAME_LEFT;
  payload: {
    gameId: number;
  };
}

export interface PlayerPresencePayload {
  gameId: number;
  userId: number;
  playerCount: number;
  maxPlayers: number;
}

export interface PlayerJoinedMessage {
  type: typeof WS_MESSAGE_TYPES.PLAYER_JOINED;
  payload: PlayerPresencePayload;
}

export interface PlayerLeftMessage {
  type: typeof WS_MESSAGE_TYPES.PLAYER_LEFT;
  payload: PlayerPresencePayload;
}

/** Sent after every change to a game the socket is subscribed to. A finished game is a state with status `completed`. */
export interface GameStateUpdateMessage {
  type: typeof WS_MESSAGE_TYPES.GAME_STATE_UPDATE;
  payload: GameStateUpdatePayload;
}

export interface ReadyStatusUpdateMessage {
  type: typeof WS_MESSAGE_TYPES.READY_STATUS_UPDATE;
  payload: {
    ready: boolean;
    allReady: boolean;
    gameStarted: boolean;
  };
}

export interface ErrorMessage {
  type: typeof WS_MESSAGE_TYPES.ERROR;
  payload: string;
}

// ============================================================================
// Union Types for Type Safety
// ============================================================================

export type ClientMessage =
  | CreateGameMessage
  | JoinGameMessage
  | ListGamesMessage
  | LeaveGameMessage
  | SubscribeGameMessage
  | SetReadyMessage
  | MakeMoveMessage;

export type ServerMessage =
  | GameCreatedMessage
  | GameJoinedMessage
  | GamesListMessage
  | GameLeftMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | GameStateUpdateMessage
  | ReadyStatusUpdateMessage
  | ErrorMessage;

export type WebSocketMessage = ClientMessage | ServerMessage;

export type ServerMessageType = ServerMessage['type'];

export type ServerMessageOf<K extends ServerMessageType> = Extract<ServerMessage, { type: K }>;

/**
 * Shared WebSocket Message Types
 * 
 * This file defines all WebSocket message types used between frontend and backend
 * to ensure type safety and prevent message type mismatches.
 */

import type { GameEndPayload, GameStateUpdatePayload, GameStatus, Move, PlayerGameView } from './game-types.ts';

// ============================================================================
// Base Types
// ============================================================================

export interface Position {
  x: number;
  y: number;
}

// ============================================================================
// Message Type Constants (eliminates magic strings)
// ============================================================================

export const WS_MESSAGE_TYPES = {
  // Client -> Server
  SUBSCRIBE_GAME: 'subscribe_game',
  UNSUBSCRIBE_GAME: 'unsubscribe_game',
  JOIN_GAME: 'join_game',
  MAKE_MOVE: 'make_move',
  SET_READY: 'set_ready',
  CREATE_GAME: 'create_game',
  LIST_GAMES: 'list_games',
  LEAVE_GAME: 'leave_game',
  START_GAME: 'start_game',

  // Server -> Client
  GAME_STATE_UPDATE: 'game_state_update',
  READY_STATUS_UPDATE: 'ready_status_update',
  AVAILABLE_MOVES: 'available_moves',
  PLAYERS_IN_GAME: 'players_in_game',
  PLAYER_READY_STATUS: 'player_ready_status',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  GAME_START: 'game_start',
  GAME_READY_FOR_START: 'game_ready_for_start',
  GAME_CREATED: 'game_created',
  GAME_JOINED: 'game_joined',
  GAMES_LIST: 'games_list',
  GAME_LEFT: 'game_left',
  GAME_UNSUBSCRIBED: 'game_unsubscribed',
  ERROR: 'error',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',

  // Bidirectional
  PING: 'ping',
  PONG: 'pong'
} as const;

export type WSMessageType = typeof WS_MESSAGE_TYPES[keyof typeof WS_MESSAGE_TYPES];

// ============================================================================
// Move Types
// ============================================================================

export interface PlaceWorkerMove {
  type: 'place_worker';
  workerId?: number;
  position: Position;
}

export interface MoveWorkerMove {
  type: 'move_worker';
  workerId?: number;
  fromPosition: Position;
  position: Position;
}

export interface BuildMove {
  type: 'build_block' | 'build_dome';
  position: Position;
  buildingLevel?: number;
  buildingType?: string;
}

export type GameMove = PlaceWorkerMove | MoveWorkerMove | BuildMove;

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

export interface UnsubscribeGameMessage {
  type: typeof WS_MESSAGE_TYPES.UNSUBSCRIBE_GAME;
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
    move: GameMove;
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

export interface GameUnsubscribedMessage {
  type: typeof WS_MESSAGE_TYPES.GAME_UNSUBSCRIBED;
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

/**
 * Sent after every change to a game the socket is subscribed to. A finished game also gets one carrying
 * GameEndPayload instead of a state, so check for `state` before using it.
 */
export interface GameStateUpdateMessage {
  type: typeof WS_MESSAGE_TYPES.GAME_STATE_UPDATE;
  payload: GameStateUpdatePayload | GameEndPayload;
}

export interface ReadyStatusUpdateMessage {
  type: typeof WS_MESSAGE_TYPES.READY_STATUS_UPDATE;
  payload: {
    ready: boolean;
    allReady: boolean;
    gameStarted: boolean;
  };
}

export interface GameStartMessage {
  type: typeof WS_MESSAGE_TYPES.GAME_START;
  payload: {
    gameId: number;
    activePlayerId: number | null;
    availableMoves?: Move[];
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
  | UnsubscribeGameMessage
  | SetReadyMessage
  | MakeMoveMessage;

export type ServerMessage =
  | GameCreatedMessage
  | GameJoinedMessage
  | GamesListMessage
  | GameLeftMessage
  | GameUnsubscribedMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | GameStateUpdateMessage
  | ReadyStatusUpdateMessage
  | GameStartMessage
  | ErrorMessage;

export type WebSocketMessage = ClientMessage | ServerMessage;

// ============================================================================
// Generic Message Interface (for backwards compatibility)
// ============================================================================

export interface GenericWSMessage {
  type: string;
  payload?: any;
}

// ============================================================================
// Type Guards for Runtime Type Checking
// ============================================================================

export function isClientMessage(message: GenericWSMessage): message is ClientMessage {
  const clientTypes: string[] = [
    WS_MESSAGE_TYPES.CREATE_GAME,
    WS_MESSAGE_TYPES.JOIN_GAME,
    WS_MESSAGE_TYPES.LIST_GAMES,
    WS_MESSAGE_TYPES.LEAVE_GAME,
    WS_MESSAGE_TYPES.SUBSCRIBE_GAME,
    WS_MESSAGE_TYPES.UNSUBSCRIBE_GAME,
    WS_MESSAGE_TYPES.SET_READY,
    WS_MESSAGE_TYPES.MAKE_MOVE
  ];
  return clientTypes.includes(message.type);
}

export function isServerMessage(message: GenericWSMessage): message is ServerMessage {
  const serverTypes: string[] = [
    WS_MESSAGE_TYPES.GAME_CREATED,
    WS_MESSAGE_TYPES.GAME_JOINED,
    WS_MESSAGE_TYPES.GAMES_LIST,
    WS_MESSAGE_TYPES.GAME_LEFT,
    WS_MESSAGE_TYPES.GAME_UNSUBSCRIBED,
    WS_MESSAGE_TYPES.PLAYER_JOINED,
    WS_MESSAGE_TYPES.PLAYER_LEFT,
    WS_MESSAGE_TYPES.GAME_STATE_UPDATE,
    WS_MESSAGE_TYPES.READY_STATUS_UPDATE,
    WS_MESSAGE_TYPES.GAME_START,
    WS_MESSAGE_TYPES.ERROR
  ];
  return serverTypes.includes(message.type);
}

// ============================================================================
// Helper Functions
// ============================================================================

export function createMessage<T extends WebSocketMessage>(
  type: T['type'], 
  payload: T['payload']
): T {
  return { type, payload } as T;
}

export function isMessageType<T extends WSMessageType>(
  message: GenericWSMessage, 
  type: T
): message is Extract<WebSocketMessage, { type: T }> {
  return message.type === type;
}

/**
 * Shared WebSocket Message Types
 * 
 * This file defines all WebSocket message types used between frontend and backend
 * to ensure type safety and prevent message type mismatches.
 */

import type {
  GameStartPayload,
  GameStateUpdatePayload,
  MoveCommand,
  PlayerGameView,
} from './game-types.ts';

// ============================================================================
// Message Type Constants (eliminates magic strings)
// ============================================================================

export const WS_MESSAGE_TYPES = {
  // Client -> Server
  SUBSCRIBE_GAME: 'subscribe_game',
  JOIN_GAME: 'join_game',
  MAKE_MOVE: 'make_move',
  SET_READY: 'set_ready',
  LEAVE_GAME: 'leave_game',

  // Server -> Client
  GAME_STATE_UPDATE: 'game_state_update',
  READY_STATUS_UPDATE: 'ready_status_update',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  GAME_START: 'game_start',
  GAME_JOINED: 'game_joined',
  ERROR: 'error'
} as const;

export type WSMessageType = typeof WS_MESSAGE_TYPES[keyof typeof WS_MESSAGE_TYPES];

// ============================================================================
// Client -> Server Messages
// ============================================================================

export interface JoinGameMessage {
  type: typeof WS_MESSAGE_TYPES.JOIN_GAME;
  payload: {
    gameId: number;
  };
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

export interface GameJoinedMessage {
  type: typeof WS_MESSAGE_TYPES.GAME_JOINED;
  payload: {
    gameId: number;
    gameState: PlayerGameView;
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
 * Sent after every change to a game the socket is subscribed to, including the move that ends it
 * (`status` is then `completed`, with `winnerId` and `winReason`).
 */
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

export interface GameStartMessage {
  type: typeof WS_MESSAGE_TYPES.GAME_START;
  payload: GameStartPayload;
}

export interface ErrorMessage {
  type: typeof WS_MESSAGE_TYPES.ERROR;
  payload: string;
}

// ============================================================================
// Union Types for Type Safety
// ============================================================================

export type ClientMessage =
  | JoinGameMessage
  | LeaveGameMessage
  | SubscribeGameMessage
  | SetReadyMessage
  | MakeMoveMessage;

export type ServerMessage =
  | GameJoinedMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | GameStateUpdateMessage
  | ReadyStatusUpdateMessage
  | GameStartMessage
  | ErrorMessage;

export type WebSocketMessage = ClientMessage | ServerMessage;

export type ServerMessageType = ServerMessage['type'];

export type ServerMessageOf<K extends ServerMessageType> = Extract<ServerMessage, { type: K }>;

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
    WS_MESSAGE_TYPES.JOIN_GAME,
    WS_MESSAGE_TYPES.LEAVE_GAME,
    WS_MESSAGE_TYPES.SUBSCRIBE_GAME,
    WS_MESSAGE_TYPES.SET_READY,
    WS_MESSAGE_TYPES.MAKE_MOVE
  ];
  return clientTypes.includes(message.type);
}

export function isServerMessage(message: GenericWSMessage): message is ServerMessage {
  const serverTypes: string[] = [
    WS_MESSAGE_TYPES.GAME_JOINED,
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

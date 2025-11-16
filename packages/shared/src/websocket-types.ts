/**
 * Shared WebSocket Message Types
 * 
 * This file defines all WebSocket message types used between frontend and backend
 * to ensure type safety and prevent message type mismatches.
 */

// ============================================================================
// Base Types
// ============================================================================

export interface Position {
  x: number;
  y: number;
}

export interface PlayerReadyStatus {
  userId: number;
  isReady: boolean;
  username?: string;
  displayName?: string;
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
  
  // Server -> Client
  GAME_STATE_UPDATE: 'game_state_update',
  AVAILABLE_MOVES: 'available_moves',
  PLAYERS_IN_GAME: 'players_in_game',
  PLAYER_READY_STATUS: 'player_ready_status',
  GAME_START: 'game_start',
  GAME_READY_FOR_START: 'game_ready_for_start',
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

export interface JoinGameMessage {
  type: typeof WS_MESSAGE_TYPES.JOIN_GAME;
  payload: {
    gameId: number;
  };
}

export interface MakeMoveMessage {
  type: typeof WS_MESSAGE_TYPES.MAKE_MOVE;
  payload: {
    gameId: number;
    move: GameMove;
  };
}

export interface SetReadyMessage {
  type: typeof WS_MESSAGE_TYPES.SET_READY;
  payload: {
    gameId: number;
    isReady: boolean;
  };
}

// ============================================================================
// Server -> Client Messages  
// ============================================================================

export interface GameStateUpdateMessage {
  type: typeof WS_MESSAGE_TYPES.GAME_STATE_UPDATE;
  payload: {
    id: string;
    board: any; // Board state - keeping flexible for now
    players: any[]; // Player list - keeping flexible for now
    currentPlayer: string;
    phase: string;
    game_status?: string;
    game_phase?: string;
    current_player_id?: number;
    playersReadyStatus?: PlayerReadyStatus[];
    [key: string]: any; // Allow additional fields for compatibility
  };
}

export interface AvailableMovesMessage {
  type: typeof WS_MESSAGE_TYPES.AVAILABLE_MOVES;
  payload: Array<{
    type: string;
    position?: Position;
    from?: Position;
    to?: Position;
    workerId?: number;
    validPositions?: Position[];
  }>;
}

export interface PlayersInGameMessage {
  type: typeof WS_MESSAGE_TYPES.PLAYERS_IN_GAME;
  payload: Array<{
    id: number;
    username: string;
    display_name?: string;
  }>;
}

export interface ErrorMessage {
  type: typeof WS_MESSAGE_TYPES.ERROR;
  payload: string | {
    message: string;
    code?: string;
  };
}

export interface ConnectedMessage {
  type: typeof WS_MESSAGE_TYPES.CONNECTED;
  payload: {
    connected: boolean;
  };
}

export interface DisconnectedMessage {
  type: typeof WS_MESSAGE_TYPES.DISCONNECTED;
  payload: {
    reason?: string;
  };
}

export interface PlayerReadyStatusMessage {
  type: typeof WS_MESSAGE_TYPES.PLAYER_READY_STATUS;
  payload: PlayerReadyStatus[];
}

export interface GameStartMessage {
  type: typeof WS_MESSAGE_TYPES.GAME_START;
  payload: any;
}

export interface GameReadyForStartMessage {
  type: typeof WS_MESSAGE_TYPES.GAME_READY_FOR_START;
  payload: any;
}

// ============================================================================
// Union Types for Type Safety
// ============================================================================

export type ClientMessage = 
  | SubscribeGameMessage
  | UnsubscribeGameMessage
  | JoinGameMessage
  | MakeMoveMessage
  | SetReadyMessage;

export type ServerMessage =
  | GameStateUpdateMessage
  | AvailableMovesMessage
  | PlayersInGameMessage
  | PlayerReadyStatusMessage
  | GameStartMessage
  | GameReadyForStartMessage
  | ErrorMessage
  | ConnectedMessage
  | DisconnectedMessage;

export type WebSocketMessage = ClientMessage | ServerMessage;

// ============================================================================
// Generic Message Interface (for backwards compatibility)
// ============================================================================

export interface GenericWSMessage {
  type: string;
  payload: any;
}

// ============================================================================
// Type Guards for Runtime Type Checking
// ============================================================================

export function isClientMessage(message: GenericWSMessage): message is ClientMessage {
  const clientTypes: string[] = [
    WS_MESSAGE_TYPES.SUBSCRIBE_GAME,
    WS_MESSAGE_TYPES.UNSUBSCRIBE_GAME,
    WS_MESSAGE_TYPES.JOIN_GAME,
    WS_MESSAGE_TYPES.MAKE_MOVE,
    WS_MESSAGE_TYPES.SET_READY
  ];
  return clientTypes.includes(message.type);
}

export function isServerMessage(message: GenericWSMessage): message is ServerMessage {
  const serverTypes: string[] = [
    WS_MESSAGE_TYPES.GAME_STATE_UPDATE,
    WS_MESSAGE_TYPES.AVAILABLE_MOVES,
    WS_MESSAGE_TYPES.PLAYERS_IN_GAME,
    WS_MESSAGE_TYPES.PLAYER_READY_STATUS,
    WS_MESSAGE_TYPES.GAME_START,
    WS_MESSAGE_TYPES.GAME_READY_FOR_START,
    WS_MESSAGE_TYPES.ERROR,
    WS_MESSAGE_TYPES.CONNECTED,
    WS_MESSAGE_TYPES.DISCONNECTED
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

export interface Position {
  x: number;
  y: number;
}

export type BlockType = 'BASE' | 'MID' | 'TOP' | 'DOME';

export type PieceType = BlockType | 'WORKER';

export interface GamePiece {
  type: PieceType;
  position: Position;
  playerId?: string;
}

export interface Stack {
  pieces: PieceType[];
  position: Position;
}

export interface Board {
  spaces: Stack[][];
}

export interface Player {
  id: string;
  username: string;
  color: string;
  workers: Position[];
}

export interface PlayerReadyStatus {
  userId: number;
  isReady: boolean;
}

export interface GameState {
  id: string;
  board: Board;
  players: Player[];
  currentPlayer: string;
  phase: 'SETUP' | 'PLAYING' | 'FINISHED';
  winner?: string;

  // Database fields from backend
  user_creator_id?: number;
  player_count?: number;
  game_status?: 'waiting' | 'ready' | 'in-progress' | 'completed' | 'aborted';
  game_phase?: 'waiting' | 'placing' | 'moving' | 'building' | null;
  current_player_id?: number | null;
  winner_id?: number | null;
  created_at?: string;
  started_at?: string | null;
  finished_at?: string | null;

  // Ready status fields
  currentUserReady?: boolean;
  playersReadyStatus?: PlayerReadyStatus[];
}

export interface Move {
  type: 'PLACE_WORKER' | 'MOVE_WORKER' | 'BUILD_BLOCK';
  from?: Position;
  to: Position;
  blockType?: BlockType;
}

// New WebSocket message types for real-time gameplay
export interface PlaceWorkerMove {
  type: 'place_worker';
  workerId: 1 | 2;
  position: Position;
}

export interface AvailableMove {
  type: 'place_worker';
  workerId: 1 | 2;
  validPositions: Position[];
}

// WebSocket message types
export interface YourTurnMessage {
  type: 'your_turn';
  gameState: GameState;
  availableMoves: AvailableMove[];
}

export interface GameUpdateMessage {
  type: 'game_update';
  gameState: GameState;
  lastMove?: {
    playerId: string;
    type: string;
    workerId?: number;
    position?: Position;
  };
  nextPlayer?: string;
}

export interface MakeMoveMessage {
  type: 'make_move';
  move: PlaceWorkerMove;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
}

export interface AvailablePlay {
  type: string;
  position?: Position;
  from?: Position;
  to?: Position;
}

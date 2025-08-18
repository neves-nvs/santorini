export interface Position {
  x: number;
  y: number;
}

export interface BuildPosition extends Position {
  buildingLevel?: number;  // Level that will be built (1, 2, 3)
  buildingType?: string;   // "dome" for dome builds
  moveType?: 'build_block' | 'build_dome';  // Type of building move
  serverMoveObject?: any;  // Complete server move object for direct use
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

// Backend format for board spaces
export interface BoardSpace {
  x: number;
  y: number;
  height: number;
  hasDome?: boolean;
  workers: Array<{
    playerId: number;
    workerId: number;
    color: string;
  }>;
}

export interface Board {
  spaces: BoardSpace[]; // Changed from Stack[][] to BoardSpace[] to match backend
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

  // Turn management fields from backend
  turnState?: {
    gameId: number;
    currentPlayerId: number;
    currentPhase: 'placing' | 'moving' | 'building';
    turnNumber: number;
    placingTurnsCompleted: number;
    isGameOver: boolean;
    winner?: number;
    winReason?: string;
  };
  availablePlays?: any[];
  isMyTurn?: boolean;
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
  type: 'place_worker' | 'move_worker' | 'build_block';
  workerId: 1 | 2;
  validPositions: (Position | BuildPosition)[];
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

// Core game types and interfaces for Santorini

/**
 * Represents a position on the 5x5 game board
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Represents a single cell on the game board
 */
export interface BoardCell {
  height: number; // 0-3 (building levels)
  hasDome: boolean;
  worker?: {
    playerId: number;
    workerId: number;
  };
}

/**
 * Represents the complete state of the game board
 */
export interface BoardState {
  cells: BoardCell[][]; // 5x5 grid
  workers: Map<string, { x: number; y: number; playerId: number }>; // workerId -> position
}

/**
 * Represents a player action/move in the game
 */
export interface Play {
  type: string;
  position?: Position;
  workerId?: number;
  fromPosition?: Position; // For move_worker actions
  fromWorkerPosition?: Position; // For build actions - which worker is building
  buildingType?: string; // For dome building
  buildingLevel?: number; // For block building (1, 2, 3)
  [key: string]: any; // Allow additional properties for extensibility
}

/**
 * Game phases in Santorini
 */
export type GamePhase = 'placing' | 'moving' | 'building';

/**
 * Context information for game state and current situation
 */
export interface GameContext {
  gameId: number;
  currentPhase: GamePhase;
  currentPlayerId?: number;
  boardState?: BoardState;
  playerCount?: number; // Number of players in the game
  lastMovedWorkerId?: number; // Which worker just moved (for building restrictions)
  lastMovedWorkerPosition?: Position; // Where the worker moved to
}

/**
 * Interface for generating valid moves in different game phases
 */
export interface MoveGenerator {
  generatePlacingMoves(context: GameContext): Play[];
  generateMovingMoves(context: GameContext): Play[];
  generateBuildingMoves(context: GameContext): Play[];
}

/**
 * Hook interface for extending game rules (God Powers)
 * Plugins implement this interface to modify game behavior
 */
export interface GameHook {
  name: string;
  priority?: number; // Lower numbers run first

  // Phase-specific hooks
  modifyPlacingMoves?(moves: Play[], context: GameContext): Play[];
  modifyMovingMoves?(moves: Play[], context: GameContext): Play[];
  modifyBuildingMoves?(moves: Play[], context: GameContext): Play[];

  // Turn hooks (for turn-changing power cards)
  beforeTurn?(context: GameContext): GameContext;
  afterTurn?(context: GameContext): GameContext;

  // Move validation hooks
  validateMove?(move: Play, context: GameContext): boolean;
}

/**
 * Result of executing a move
 */
export interface MoveResult {
  success: boolean;
  isWin?: boolean;
  winner?: number;
  error?: string;
  newBoardState?: BoardState;
}

/**
 * Worker information
 */
export interface Worker {
  x: number;
  y: number;
  playerId: number;
  workerId?: number;
}

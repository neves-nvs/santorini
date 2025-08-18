// Game Engine with Hook System
// This will evolve into a state machine later

import { BoardState } from './boardState';

export interface Position {
  x: number;
  y: number;
}

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

export interface GameContext {
  gameId: number;
  currentPhase: GamePhase;
  currentPlayerId?: number;
  boardState?: BoardState; // Proper board state
  playerCount?: number; // Number of players in the game
  lastMovedWorkerId?: number; // Which worker just moved (for building restrictions)
  lastMovedWorkerPosition?: Position; // Where the worker moved to
}

// Re-export BoardState for convenience
export type { BoardState } from './boardState';

export type GamePhase = 'placing' | 'moving' | 'building';

// Hook interface - plugins implement this
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

// Move generator interface
export interface MoveGenerator {
  generatePlacingMoves(context: GameContext): Play[];
  generateMovingMoves(context: GameContext): Play[];
  generateBuildingMoves(context: GameContext): Play[];
}

// Standard Santorini rules
export class StandardMoveGenerator implements MoveGenerator {
  generatePlacingMoves(context: GameContext): Play[] {
    const moves: Play[] = [];

    // If no board state provided, generate all positions (fallback for tests)
    if (!context.boardState) {
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          moves.push({
            type: "place_worker",
            position: { x, y }
          });
        }
      }
      return moves;
    }

    // Generate moves only for empty positions
    const { getEmptyPositions } = require('./boardState');
    const emptyPositions = getEmptyPositions(context.boardState);

    for (const position of emptyPositions) {
      moves.push({
        type: "place_worker",
        position: { x: position.x, y: position.y }
      });
    }

    return moves;
  }
  
  generateMovingMoves(context: GameContext): Play[] {
    const moves: Play[] = [];

    // If no board state provided, return empty (fallback for tests)
    if (!context.boardState || !context.currentPlayerId) {
      return moves;
    }

    // Get current player's workers
    const { getPlayerWorkers, isValidPosition, isPositionOccupied, hasdome, getHeight } = require('./boardState');
    const playerWorkers = getPlayerWorkers(context.boardState, context.currentPlayerId);

    // Generate moves for each worker
    for (const worker of playerWorkers) {
      const workerHeight = getHeight(context.boardState, worker.x, worker.y);

      // Check all 8 adjacent positions
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue; // Skip current position

          const newX = worker.x + dx;
          const newY = worker.y + dy;

          // Check if position is valid
          if (!isValidPosition(newX, newY)) continue;

          // Check if position is occupied
          if (isPositionOccupied(context.boardState, newX, newY)) continue;

          // Check if position has dome
          if (hasdome(context.boardState, newX, newY)) continue;

          // Check height restriction (can move up at most 1 level)
          const targetHeight = getHeight(context.boardState, newX, newY);
          if (targetHeight > workerHeight + 1) continue;

          // Valid move found
          moves.push({
            type: "move_worker",
            workerId: worker.workerId,
            position: { x: newX, y: newY },
            fromPosition: { x: worker.x, y: worker.y }
          });
        }
      }
    }

    return moves;
  }
  
  generateBuildingMoves(context: GameContext): Play[] {
    const moves: Play[] = [];

    // If no board state provided, return empty (fallback for tests)
    if (!context.boardState || !context.currentPlayerId) {
      return moves;
    }

    const { getPlayerWorkers, isValidPosition, isPositionOccupied, hasdome, getHeight } = require('./boardState');

    // In building phase, only the worker that just moved can build
    let workersToCheck = [];

    console.log(`🔧 Building generation debug:`, {
      lastMovedWorkerId: context.lastMovedWorkerId,
      lastMovedWorkerPosition: context.lastMovedWorkerPosition,
      currentPlayerId: context.currentPlayerId
    });

    if (context.lastMovedWorkerId && context.lastMovedWorkerPosition) {
      // Only the worker that just moved can build
      workersToCheck = [{
        workerId: context.lastMovedWorkerId,
        x: context.lastMovedWorkerPosition.x,
        y: context.lastMovedWorkerPosition.y,
        playerId: context.currentPlayerId
      }];
      console.log(`🔧 Using moved worker only: Worker ${context.lastMovedWorkerId} at (${context.lastMovedWorkerPosition.x}, ${context.lastMovedWorkerPosition.y})`);
    } else {
      // Fallback: get all player workers (for backward compatibility)
      workersToCheck = getPlayerWorkers(context.boardState, context.currentPlayerId);
      console.log(`🔧 Fallback: Using all ${workersToCheck.length} workers for player ${context.currentPlayerId}`);
    }

    // Generate building moves for the specified worker(s)
    for (const worker of workersToCheck) {
      // Check all 8 adjacent positions
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue; // Skip current position

          const buildX = worker.x + dx;
          const buildY = worker.y + dy;

          // Check if position is valid
          if (!isValidPosition(buildX, buildY)) continue;

          // Check if position is occupied
          if (isPositionOccupied(context.boardState, buildX, buildY)) continue;

          // Check if position has dome
          if (hasdome(context.boardState, buildX, buildY)) continue;

          // Get current height to determine what can be built
          const currentHeight = getHeight(context.boardState, buildX, buildY);

          // Build logic: blocks for levels 0-2, dome for level 3 or as alternative
          if (currentHeight < 3) {
            // Can build next level block (0->1, 1->2, 2->3)
            moves.push({
              type: "build_block",
              workerId: worker.workerId,
              playerId: context.currentPlayerId,
              position: { x: buildX, y: buildY },
              fromWorkerPosition: { x: worker.x, y: worker.y },
              buildingLevel: currentHeight + 1
            });
          } else {
            // At level 3, can only build dome
            moves.push({
              type: "build_dome",
              workerId: worker.workerId,
              playerId: context.currentPlayerId,
              position: { x: buildX, y: buildY },
              fromWorkerPosition: { x: worker.x, y: worker.y },
              buildingType: "dome"
            });
          }
        }
      }
    }

    return moves;
  }
}

// Game Engine with hooks
export class GameEngine {
  private hooks: GameHook[] = [];
  private moveGenerator: MoveGenerator;
  
  constructor(moveGenerator: MoveGenerator = new StandardMoveGenerator()) {
    this.moveGenerator = moveGenerator;
  }
  
  addHook(hook: GameHook): void {
    this.hooks.push(hook);
    // Sort by priority (lower numbers first)
    this.hooks.sort((a, b) => (a.priority || 100) - (b.priority || 100));
  }
  
  removeHook(hookName: string): void {
    this.hooks = this.hooks.filter(hook => hook.name !== hookName);
  }

  clearHooks(): void {
    this.hooks = [];
  }
  
  generateAvailablePlays(context: GameContext): Play[] {
    let moves: Play[] = [];

    // Generate base moves based on phase
    switch (context.currentPhase) {
      case 'placing':
        moves = this.moveGenerator.generatePlacingMoves(context);
        break;
      case 'moving':
        moves = this.moveGenerator.generateMovingMoves(context);
        break;
      case 'building':
        moves = this.moveGenerator.generateBuildingMoves(context);
        break;
    }

    // Apply hooks to modify moves based on current phase
    for (const hook of this.hooks) {
      switch (context.currentPhase) {
        case 'placing':
          if (hook.modifyPlacingMoves) {
            moves = hook.modifyPlacingMoves(moves, context);
          }
          break;
        case 'moving':
          if (hook.modifyMovingMoves) {
            moves = hook.modifyMovingMoves(moves, context);
          }
          break;
        case 'building':
          if (hook.modifyBuildingMoves) {
            moves = hook.modifyBuildingMoves(moves, context);
          }
          break;
      }
    }

    return moves;
  }
  
  processBeforeTurn(context: GameContext): GameContext {
    let modifiedContext = { ...context };
    
    for (const hook of this.hooks) {
      if (hook.beforeTurn) {
        modifiedContext = hook.beforeTurn(modifiedContext);
      }
    }
    
    return modifiedContext;
  }
  
  processAfterTurn(context: GameContext): GameContext {
    let modifiedContext = { ...context };
    
    for (const hook of this.hooks) {
      if (hook.afterTurn) {
        modifiedContext = hook.afterTurn(modifiedContext);
      }
    }
    
    return modifiedContext;
  }
}

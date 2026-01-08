// Game Engine with Hook System for Santorini
// Pure game logic without external dependencies

import { 
  GameContext, 
  GameHook, 
  MoveGenerator, 
  Play, 
  Position,
  MoveResult
} from './types';
import { 
  getEmptyPositions, 
  getPlayerWorkers, 
  isValidPosition, 
  isPositionOccupied, 
  hasDome, 
  getHeight,
  getAdjacentPositions,
  moveWorker,
  buildBlock,
  buildDome,
  isWinningMove,
  cloneBoardState
} from './boardState';

/**
 * Standard Santorini rules implementation
 */
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
    const playerWorkers = getPlayerWorkers(context.boardState, context.currentPlayerId);

    // Generate moves for each worker
    for (const worker of playerWorkers) {
      const workerHeight = getHeight(context.boardState, worker.x, worker.y);
      const adjacentPositions = getAdjacentPositions(worker.x, worker.y);

      for (const position of adjacentPositions) {
        const { x: newX, y: newY } = position;

        // Check if position is occupied
        if (isPositionOccupied(context.boardState, newX, newY)) continue;

        // Check if position has dome
        if (hasDome(context.boardState, newX, newY)) continue;

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

    return moves;
  }
  
  generateBuildingMoves(context: GameContext): Play[] {
    const moves: Play[] = [];

    // If no board state provided, return empty (fallback for tests)
    if (!context.boardState || !context.currentPlayerId) {
      return moves;
    }

    // In building phase, only the worker that just moved can build
    let workersToCheck = [];

    if (context.lastMovedWorkerId && context.lastMovedWorkerPosition) {
      // Only the worker that just moved can build
      workersToCheck = [{
        workerId: context.lastMovedWorkerId,
        x: context.lastMovedWorkerPosition.x,
        y: context.lastMovedWorkerPosition.y,
        playerId: context.currentPlayerId
      }];
    } else {
      // Fallback: get all player workers (for backward compatibility)
      workersToCheck = getPlayerWorkers(context.boardState, context.currentPlayerId);
    }

    // Generate building moves for the specified worker(s)
    for (const worker of workersToCheck) {
      const adjacentPositions = getAdjacentPositions(worker.x, worker.y);

      for (const position of adjacentPositions) {
        const { x: buildX, y: buildY } = position;

        // Check if position is occupied
        if (isPositionOccupied(context.boardState, buildX, buildY)) continue;

        // Check if position has dome
        if (hasDome(context.boardState, buildX, buildY)) continue;

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

          // Can also build dome at any level (alternative option)
          moves.push({
            type: "build_dome",
            workerId: worker.workerId,
            playerId: context.currentPlayerId,
            position: { x: buildX, y: buildY },
            fromWorkerPosition: { x: worker.x, y: worker.y },
            buildingType: "dome"
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

    return moves;
  }
}

/**
 * Main Game Engine with extensible hook system
 */
export class GameEngine {
  private hooks: GameHook[] = [];
  private moveGenerator: MoveGenerator;
  
  constructor(moveGenerator: MoveGenerator = new StandardMoveGenerator()) {
    this.moveGenerator = moveGenerator;
  }
  
  /**
   * Add a game hook (God Power)
   */
  addHook(hook: GameHook): void {
    this.hooks.push(hook);
    // Sort by priority (lower numbers first)
    this.hooks.sort((a, b) => (a.priority || 100) - (b.priority || 100));
  }
  
  /**
   * Remove a game hook by name
   */
  removeHook(hookName: string): void {
    this.hooks = this.hooks.filter(hook => hook.name !== hookName);
  }

  /**
   * Clear all hooks
   */
  clearHooks(): void {
    this.hooks = [];
  }

  /**
   * Get all registered hooks
   */
  getHooks(): GameHook[] {
    return [...this.hooks];
  }
  
  /**
   * Generate available plays for the current game context
   */
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
  
  /**
   * Process before turn hooks
   */
  processBeforeTurn(context: GameContext): GameContext {
    let modifiedContext = { ...context };
    
    for (const hook of this.hooks) {
      if (hook.beforeTurn) {
        modifiedContext = hook.beforeTurn(modifiedContext);
      }
    }
    
    return modifiedContext;
  }
  
  /**
   * Process after turn hooks
   */
  processAfterTurn(context: GameContext): GameContext {
    let modifiedContext = { ...context };
    
    for (const hook of this.hooks) {
      if (hook.afterTurn) {
        modifiedContext = hook.afterTurn(modifiedContext);
      }
    }
    
    return modifiedContext;
  }

  /**
   * Validate a move using all registered hooks
   */
  validateMove(move: Play, context: GameContext): boolean {
    for (const hook of this.hooks) {
      if (hook.validateMove && !hook.validateMove(move, context)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Execute a move and return the result
   */
  executeMove(move: Play, context: GameContext): MoveResult {
    if (!context.boardState) {
      return { success: false, error: 'No board state provided' };
    }

    // Validate the move first
    if (!this.validateMove(move, context)) {
      return { success: false, error: 'Move validation failed' };
    }

    // Clone board state to avoid mutations
    const newBoardState = cloneBoardState(context.boardState);
    let isWin = false;
    let winner: number | undefined;

    try {
      switch (move.type) {
        case 'place_worker':
          if (!move.position || !context.currentPlayerId) {
            return { success: false, error: 'Invalid place worker move' };
          }
          // Note: Worker placement logic would need workerId assignment
          // This is typically handled by the calling system
          break;

        case 'move_worker':
          if (!move.fromPosition || !move.position) {
            return { success: false, error: 'Invalid move worker move' };
          }

          // Check for winning move before executing
          if (isWinningMove(newBoardState, move.fromPosition.x, move.fromPosition.y, move.position.x, move.position.y)) {
            isWin = true;
            winner = context.currentPlayerId;
          }

          if (!moveWorker(newBoardState, move.fromPosition.x, move.fromPosition.y, move.position.x, move.position.y)) {
            return { success: false, error: 'Failed to move worker' };
          }
          break;

        case 'build_block':
          if (!move.position) {
            return { success: false, error: 'Invalid build block move' };
          }
          if (!buildBlock(newBoardState, move.position.x, move.position.y)) {
            return { success: false, error: 'Failed to build block' };
          }
          break;

        case 'build_dome':
          if (!move.position) {
            return { success: false, error: 'Invalid build dome move' };
          }
          if (!buildDome(newBoardState, move.position.x, move.position.y)) {
            return { success: false, error: 'Failed to build dome' };
          }
          break;

        default:
          return { success: false, error: `Unknown move type: ${move.type}` };
      }

      return {
        success: true,
        newBoardState,
        isWin,
        winner
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

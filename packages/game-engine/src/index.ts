// Main API entry point for @santorini/game-engine

import { GameEngine } from './gameEngine';
import { createEmptyBoard } from './boardState';
import { createGodPowerHook } from './godPowers/factory';

// Core types and interfaces
export * from './types';

// Board state management
export {
  createEmptyBoard,
  createBoardStateFromData,
  serializeBoardState,
  cloneBoardState,
  isValidPosition,
  isPositionOccupied,
  hasDome,
  getHeight,
  getEmptyPositions,
  getPlayerWorkers,
  getAdjacentPositions,
  placeWorker,
  moveWorker,
  buildBlock,
  buildDome,
  isWinningMove,
  checkPlayerWin,
  checkGameWinner
} from './boardState';

// Game engine core
export {
  StandardMoveGenerator,
  GameEngine
} from './gameEngine';

// God Powers system
export * from './godPowers';

// Convenience re-exports for common use cases
export { createGodPowerHook } from './godPowers/factory';

/**
 * Create a new game engine instance with optional god powers
 */
export function createGameEngine(godPowers: string[] = []): GameEngine {
  const engine = new GameEngine();

  // Add god powers if specified
  for (const godPowerName of godPowers) {
    const hook = createGodPowerHook(godPowerName);
    if (hook) {
      engine.addHook(hook);
    }
  }

  return engine;
}

/**
 * Utility function to create a basic game context
 */
export function createGameContext(
  gameId: number,
  phase: 'placing' | 'moving' | 'building',
  currentPlayerId?: number,
  playerCount: number = 2
) {
  return {
    gameId,
    currentPhase: phase,
    currentPlayerId,
    boardState: createEmptyBoard(),
    playerCount
  };
}

/**
 * Check if a player can make any valid moves (not blocked)
 */
export function canPlayerMove(engine: GameEngine, gameId: number, playerId: number, boardState: any): boolean {
  // Check if player can move any worker
  const movingContext = {
    gameId,
    currentPhase: 'moving' as const,
    currentPlayerId: playerId,
    boardState,
    playerCount: 2
  };

  const availableMoves = engine.generateAvailablePlays(movingContext);
  
  if (availableMoves.length === 0) {
    return false; // Cannot move
  }

  // For each possible move, check if player can build afterward
  for (const move of availableMoves) {
    if (move.type === 'move_worker' && move.position && move.workerId) {
      // Simulate the move and check if building is possible
      const buildingContext = {
        gameId,
        currentPhase: 'building' as const,
        currentPlayerId: playerId,
        boardState,
        playerCount: 2,
        lastMovedWorkerId: move.workerId,
        lastMovedWorkerPosition: move.position
      };

      const buildingMoves = engine.generateAvailablePlays(buildingContext);
      
      // If this move allows building, player is not blocked
      if (buildingMoves.length > 0) {
        return true;
      }
    }
  }

  // No move allows subsequent building - player is blocked
  return false;
}

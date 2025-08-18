// Board State Management for Santorini
// Handles board representation, worker positions, and game state queries

import { getPiecesByGame } from "./gameRepository";
import { Piece } from "../model";

export interface BoardCell {
  height: number; // 0-3 (building levels)
  hasDome: boolean;
  worker?: {
    playerId: number;
    workerId: number;
  };
}

export interface BoardState {
  cells: BoardCell[][]; // 5x5 grid
  workers: Map<string, { x: number; y: number; playerId: number }>; // workerId -> position
}

export interface Position {
  x: number;
  y: number;
}

/**
 * Create an empty 5x5 board
 */
export function createEmptyBoard(): BoardState {
  const cells: BoardCell[][] = [];
  
  for (let x = 0; x < 5; x++) {
    cells[x] = [];
    for (let y = 0; y < 5; y++) {
      cells[x][y] = {
        height: 0,
        hasDome: false
      };
    }
  }
  
  return {
    cells,
    workers: new Map()
  };
}

/**
 * Load board state from database pieces
 */
export async function loadBoardState(gameId: number): Promise<BoardState> {
  const pieces = await getPiecesByGame(gameId);
  const boardState = createEmptyBoard();
  
  for (const piece of pieces) {
    const { x, y, height, type, owner } = piece;
    
    // Validate coordinates
    if (x < 0 || x >= 5 || y < 0 || y >= 5) {
      continue; // Skip invalid positions
    }
    
    if (type === "worker") {
      const playerId = parseInt(owner);
      const workerId = piece.piece_id;

      // Place worker on the board
      boardState.cells[x][y].worker = {
        playerId,
        workerId
      };

      // Track worker position
      boardState.workers.set(`${playerId}-${workerId}`, {
        x,
        y,
        playerId
      });
    } else if (type === "building") {
      // Set building height
      boardState.cells[x][y].height = height;
    } else if (type === "dome") {
      // Place dome
      boardState.cells[x][y].hasDome = true;
    }
  }
  
  return boardState;
}

/**
 * Save board state to database
 */
export async function saveBoardState(gameId: number, boardState: BoardState): Promise<void> {
  const { db } = require('../database');

  // Clear existing pieces for this game
  await db.deleteFrom('pieces').where('game_id', '=', gameId).execute();

  // Save all pieces (workers, buildings, domes)
  const pieces = [];

  for (let x = 0; x < 5; x++) {
    for (let y = 0; y < 5; y++) {
      const cell = boardState.cells[x][y];

      // Save building height if > 0
      if (cell.height > 0) {
        pieces.push({
          game_id: gameId,
          piece_id: pieces.length + 1,
          x,
          y,
          height: cell.height,
          type: 'building',
          owner: 'none'
        });
      }

      // Save dome if present
      if (cell.hasDome) {
        pieces.push({
          game_id: gameId,
          piece_id: pieces.length + 1,
          x,
          y,
          height: cell.height,
          type: 'dome',
          owner: 'none'
        });
      }

      // Save worker if present
      if (cell.worker) {
        pieces.push({
          game_id: gameId,
          piece_id: cell.worker.workerId, // Use actual worker ID
          x,
          y,
          height: cell.height,
          type: 'worker',
          owner: cell.worker.playerId.toString() // Save as string number
        });
      }
    }
  }

  // Insert all pieces
  if (pieces.length > 0) {
    await db.insertInto('pieces').values(pieces).execute();
  }
}

/**
 * Check if a position is valid (within board bounds)
 */
export function isValidPosition(x: number, y: number): boolean {
  return x >= 0 && x < 5 && y >= 0 && y < 5;
}

/**
 * Check if a position is occupied by a worker
 */
export function isPositionOccupied(boardState: BoardState, x: number, y: number): boolean {
  if (!isValidPosition(x, y)) return true; // Invalid positions are "occupied"
  return boardState.cells[x][y].worker !== undefined;
}

/**
 * Check if a position has a dome
 */
export function hasdome(boardState: BoardState, x: number, y: number): boolean {
  if (!isValidPosition(x, y)) return true; // Invalid positions are "domed"
  return boardState.cells[x][y].hasDome;
}

/**
 * Get the height of a position
 */
export function getHeight(boardState: BoardState, x: number, y: number): number {
  if (!isValidPosition(x, y)) return 0;
  return boardState.cells[x][y].height;
}

/**
 * Get all empty positions (for placing workers)
 */
export function getEmptyPositions(boardState: BoardState): Position[] {
  const emptyPositions: Position[] = [];
  
  for (let x = 0; x < 5; x++) {
    for (let y = 0; y < 5; y++) {
      if (!isPositionOccupied(boardState, x, y)) {
        emptyPositions.push({ x, y });
      }
    }
  }
  
  return emptyPositions;
}

/**
 * Get workers belonging to a specific player
 */
export function getPlayerWorkers(boardState: BoardState, playerId: number): Array<{ x: number; y: number; workerId: number }> {
  const workers: Array<{ x: number; y: number; workerId: number }> = [];
  
  for (const [workerKey, position] of boardState.workers) {
    if (position.playerId === playerId) {
      const workerId = parseInt(workerKey.split('-')[1]);
      workers.push({
        x: position.x,
        y: position.y,
        workerId
      });
    }
  }
  
  return workers;
}

/**
 * Count workers for a specific player
 */
export function countPlayerWorkers(boardState: BoardState, playerId: number): number {
  return getPlayerWorkers(boardState, playerId).length;
}

/**
 * Check if placing phase is complete for a player
 * In Santorini, each player places 2 workers
 */
export function isPlacingPhaseComplete(boardState: BoardState, playerId: number): boolean {
  return countPlayerWorkers(boardState, playerId) >= 2;
}

/**
 * Check if placing phase is complete for all players
 */
export function isPlacingPhaseCompleteForAll(boardState: BoardState, playerCount: number): boolean {
  for (let playerId = 1; playerId <= playerCount; playerId++) {
    if (!isPlacingPhaseComplete(boardState, playerId)) {
      return false;
    }
  }
  return true;
}

/* -------------------------------------------------------------------------- */
/*                              Win Detection                                 */
/* -------------------------------------------------------------------------- */

/**
 * Check if a move from one position to another results in a win
 * Win condition: Worker moves from level 2 to level 3
 */
export function isWinningMove(boardState: BoardState, fromX: number, fromY: number, toX: number, toY: number): boolean {
  // Validate positions
  if (!isValidPosition(fromX, fromY) || !isValidPosition(toX, toY)) {
    return false;
  }

  const fromHeight = getHeight(boardState, fromX, fromY);
  const toHeight = getHeight(boardState, toX, toY);

  // Win condition: move from level 2 to level 3
  return fromHeight === 2 && toHeight === 3;
}

/**
 * Check if a player has won the game
 * A player wins if any of their workers is on level 3 (and got there by moving from level 2)
 */
export function checkPlayerWin(boardState: BoardState, playerId: number): boolean {
  const playerWorkers = getPlayerWorkers(boardState, playerId);

  for (const worker of playerWorkers) {
    const workerHeight = getHeight(boardState, worker.x, worker.y);
    if (workerHeight === 3) {
      return true;
    }
  }

  return false;
}

/**
 * Check if any player has won the game
 * Returns the winning player ID, or null if no winner
 */
export function checkGameWinner(boardState: BoardState, playerCount: number): number | null {
  for (let playerId = 1; playerId <= playerCount; playerId++) {
    if (checkPlayerWin(boardState, playerId)) {
      return playerId;
    }
  }
  return null;
}

/**
 * Check if a player is blocked (cannot complete a full turn)
 * This is a loss condition - if a player cannot move any worker AND build with it, they lose
 * A complete turn requires: 1) Move a worker, 2) Build with that worker
 */
export function isPlayerBlocked(boardState: BoardState, playerId: number): boolean {
  // Use the game engine to check if player has any valid moves or builds
  const GameEngine = require('./gameEngine').GameEngine;
  const gameEngine = new GameEngine();

  // Check if player can move any worker
  const movingContext = {
    gameId: 1, // Dummy ID for checking
    currentPhase: 'moving',
    currentPlayerId: playerId,
    boardState,
    playerCount: 2
  };

  const availableMoves = gameEngine.generateAvailablePlays(movingContext);

  // If no moves available, player is blocked
  if (availableMoves.length === 0) {
    return true;
  }

  // Check if player can build after any possible move
  // We need to simulate each move and check if building is possible
  for (const move of availableMoves) {
    if (move.type === 'move_worker' && move.position && move.fromPosition) {
      // Create a temporary board state with the move applied
      const tempBoardState = JSON.parse(JSON.stringify(boardState)); // Deep copy

      // Reconstruct the workers Map (JSON.parse doesn't preserve Maps)
      tempBoardState.workers = new Map();
      for (const [key, value] of boardState.workers.entries()) {
        tempBoardState.workers.set(key, value);
      }

      // Apply the move to temp board state
      const fromX = move.fromPosition.x;
      const fromY = move.fromPosition.y;
      const toX = move.position.x;
      const toY = move.position.y;

      // Remove worker from old position
      tempBoardState.cells[fromX][fromY].worker = undefined;

      // Place worker at new position
      tempBoardState.cells[toX][toY].worker = { playerId, workerId: move.workerId };

      // Update worker tracking
      const workerKey = `${playerId}-${move.workerId}`;
      tempBoardState.workers.set(workerKey, { x: toX, y: toY, playerId });

      // Check if building is possible from the new position
      const buildingContext = {
        gameId: 1, // Dummy ID for checking
        currentPhase: 'building',
        currentPlayerId: playerId,
        boardState: tempBoardState,
        playerCount: 2
      };

      const availableBuilds = gameEngine.generateAvailablePlays(buildingContext);

      // If this move allows building, player is not blocked
      if (availableBuilds.length > 0) {
        return false;
      }
    }
  }

  // No move allows subsequent building - player is blocked
  return true;
}

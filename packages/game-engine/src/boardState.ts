// Board State Management for Santorini
// Pure game logic without database dependencies

import { BoardState, BoardCell, Position, Worker } from './types';

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
 * Create board state from serialized data
 * This allows the game engine to work with any persistence layer
 */
export function createBoardStateFromData(data: {
  cells: BoardCell[][];
  workers: Array<{ key: string; worker: Worker }>;
}): BoardState {
  const boardState: BoardState = {
    cells: data.cells,
    workers: new Map()
  };

  // Reconstruct workers map
  for (const { key, worker } of data.workers) {
    boardState.workers.set(key, worker);
  }

  return boardState;
}

/**
 * Serialize board state to plain data
 * This allows the game engine to work with any persistence layer
 */
export function serializeBoardState(boardState: BoardState): {
  cells: BoardCell[][];
  workers: Array<{ key: string; worker: Worker }>;
} {
  const workers: Array<{ key: string; worker: Worker }> = [];
  
  for (const [key, worker] of boardState.workers) {
    workers.push({ key, worker });
  }

  return {
    cells: boardState.cells,
    workers
  };
}

/**
 * Deep clone a board state
 */
export function cloneBoardState(boardState: BoardState): BoardState {
  const clonedCells: BoardCell[][] = [];
  
  for (let x = 0; x < 5; x++) {
    clonedCells[x] = [];
    for (let y = 0; y < 5; y++) {
      const cell = boardState.cells[x][y];
      clonedCells[x][y] = {
        height: cell.height,
        hasDome: cell.hasDome,
        worker: cell.worker ? { ...cell.worker } : undefined
      };
    }
  }

  const clonedWorkers = new Map<string, Worker>();
  for (const [key, worker] of boardState.workers) {
    clonedWorkers.set(key, { ...worker });
  }

  return {
    cells: clonedCells,
    workers: clonedWorkers
  };
}

/* -------------------------------------------------------------------------- */
/*                            Position Utilities                             */
/* -------------------------------------------------------------------------- */

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
export function hasDome(boardState: BoardState, x: number, y: number): boolean {
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
 * Get adjacent positions to a given position
 */
export function getAdjacentPositions(x: number, y: number): Position[] {
  const adjacent: Position[] = [];
  
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue; // Skip the center position
      
      const newX = x + dx;
      const newY = y + dy;
      
      if (isValidPosition(newX, newY)) {
        adjacent.push({ x: newX, y: newY });
      }
    }
  }
  
  return adjacent;
}

/* -------------------------------------------------------------------------- */
/*                              Board Mutations                              */
/* -------------------------------------------------------------------------- */

/**
 * Place a worker on the board
 */
export function placeWorker(boardState: BoardState, x: number, y: number, playerId: number, workerId: number): boolean {
  if (!isValidPosition(x, y) || isPositionOccupied(boardState, x, y)) {
    return false;
  }

  boardState.cells[x][y].worker = { playerId, workerId };
  boardState.workers.set(`${playerId}-${workerId}`, { x, y, playerId });
  return true;
}

/**
 * Move a worker from one position to another
 */
export function moveWorker(boardState: BoardState, fromX: number, fromY: number, toX: number, toY: number): boolean {
  if (!isValidPosition(fromX, fromY) || !isValidPosition(toX, toY)) {
    return false;
  }

  const worker = boardState.cells[fromX][fromY].worker;
  if (!worker || isPositionOccupied(boardState, toX, toY)) {
    return false;
  }

  // Remove worker from old position
  boardState.cells[fromX][fromY].worker = undefined;
  
  // Place worker at new position
  boardState.cells[toX][toY].worker = worker;
  
  // Update worker tracking
  const workerKey = `${worker.playerId}-${worker.workerId}`;
  boardState.workers.set(workerKey, { x: toX, y: toY, playerId: worker.playerId });
  
  return true;
}

/**
 * Build a block at a position
 */
export function buildBlock(boardState: BoardState, x: number, y: number): boolean {
  if (!isValidPosition(x, y) || isPositionOccupied(boardState, x, y) || hasDome(boardState, x, y)) {
    return false;
  }

  if (boardState.cells[x][y].height >= 3) {
    return false; // Cannot build higher than level 3
  }

  boardState.cells[x][y].height++;
  return true;
}

/**
 * Build a dome at a position
 */
export function buildDome(boardState: BoardState, x: number, y: number): boolean {
  if (!isValidPosition(x, y) || isPositionOccupied(boardState, x, y) || hasDome(boardState, x, y)) {
    return false;
  }

  boardState.cells[x][y].hasDome = true;
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

/**
 * Board Domain Entity
 * 
 * Represents the Santorini game board with all its state and rules.
 * Encapsulates board-level game logic and validation.
 */

import { BuildMove, Move, MoveWorkerMove, PlaceWorkerMove, Position } from './Move';
import { PlayerId } from './Player';

export interface WorkerRef {
  playerId: PlayerId;
  workerId: number;
}

export interface BoardCell {
  height: number; // 0-3 (building levels)
  hasDome: boolean;
  worker?: WorkerRef;
}

export interface MoveResult {
  success: boolean;
  isWin?: boolean;
  winner?: PlayerId;
  lastMovedWorkerId?: number;
  lastMovedWorkerPosition?: Position;
  error?: string;
}

export interface BoardCellSnapshot {
  height: number;
  hasDome: boolean;
  worker: WorkerRef | null;
}

export interface BoardSnapshot {
  cells: BoardCellSnapshot[][];
}

export class Board {
  private constructor(
    private _cells: BoardCell[][],
    private _workers: Map<string, { x: number; y: number; playerId: PlayerId }>
  ) {}

  static createEmpty(): Board {
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

    return new Board(cells, new Map());
  }

  static fromSnapshot(snapshot: BoardSnapshot | null): Board {
    if (!snapshot || !snapshot.cells) {
      return Board.createEmpty();
    }

    const cells: BoardCell[][] = [];
    const workers = new Map<string, { x: number; y: number; playerId: PlayerId }>();

    for (let x = 0; x < 5; x++) {
      cells[x] = [];
      for (let y = 0; y < 5; y++) {
        const cellData = snapshot.cells[x]?.[y] || { height: 0, hasDome: false, worker: null };

        cells[x][y] = {
          height: cellData.height || 0,
          hasDome: cellData.hasDome || false,
          worker: cellData.worker ? {
            playerId: cellData.worker.playerId,
            workerId: cellData.worker.workerId
          } : undefined
        };

        // Track workers for quick lookup
        if (cellData.worker) {
          const workerKey = `${cellData.worker.playerId}-${cellData.worker.workerId}`;
          workers.set(workerKey, {
            x,
            y,
            playerId: cellData.worker.playerId
          });
        }
      }
    }

    return new Board(cells, workers);
  }

  get cells(): ReadonlyArray<ReadonlyArray<BoardCell>> {
    return this._cells;
  }

  get workers(): ReadonlyMap<string, { x: number; y: number; playerId: PlayerId }> {
    return this._workers;
  }

  toSnapshot(): BoardSnapshot {
    const cells: BoardCellSnapshot[][] = [];
    for (let x = 0; x < 5; x++) {
      cells[x] = [];
      for (let y = 0; y < 5; y++) {
        const cell = this._cells[x][y];
        cells[x][y] = {
          height: cell.height,
          hasDome: cell.hasDome,
          worker: cell.worker ? { playerId: cell.worker.playerId, workerId: cell.worker.workerId } : null
        };
      }
    }
    return { cells };
  }

  applyMove(move: Move, playerId: PlayerId): MoveResult {
    if (!move.isValid()) {
      return { success: false, error: 'Invalid move' };
    }

    switch (move.type) {
      case 'place_worker':
        return this.applyPlaceWorker(move as PlaceWorkerMove, playerId);
      case 'move_worker':
        return this.applyMoveWorker(move as MoveWorkerMove, playerId);
      case 'build_block':
      case 'build_dome':
        return this.applyBuild(move as BuildMove);
      default:
        return { success: false, error: 'Unknown move type' };
    }
  }

  isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < 5 && y >= 0 && y < 5;
  }

  isPositionOccupied(x: number, y: number): boolean {
    if (!this.isValidPosition(x, y)) return true;
    return this._cells[x][y].worker !== undefined;
  }

  getCell(x: number, y: number): BoardCell | null {
    if (!this.isValidPosition(x, y)) return null;
    return this._cells[x][y];
  }

  private applyPlaceWorker(move: PlaceWorkerMove, playerId: PlayerId): MoveResult {
    const { position, workerId } = move;

    if (this.isPositionOccupied(position.x, position.y)) {
      return { success: false, error: 'Position occupied' };
    }

    // Place worker on board
    this._cells[position.x][position.y].worker = {
      playerId,
      workerId
    };

    // Track worker position
    const workerKey = `${playerId}-${workerId}`;
    this._workers.set(workerKey, { x: position.x, y: position.y, playerId });

    return { success: true };
  }

  private applyMoveWorker(move: MoveWorkerMove, playerId: PlayerId): MoveResult {
    const { position, fromPosition, workerId } = move;

    // Validate move (height difference, adjacency, etc.)
    if (!this.isValidWorkerMove(fromPosition, position, playerId, workerId)) {
      return { success: false, error: 'Invalid worker move' };
    }

    // Remove worker from old position
    this._cells[fromPosition.x][fromPosition.y].worker = undefined;

    // Place worker at new position
    this._cells[position.x][position.y].worker = {
      playerId,
      workerId
    };

    // Update worker tracking
    const workerKey = `${playerId}-${workerId}`;
    this._workers.set(workerKey, { x: position.x, y: position.y, playerId });

    // Check for win condition (moved from level 2 to level 3)
    const fromCell = this._cells[fromPosition.x][fromPosition.y];
    const toCell = this._cells[position.x][position.y];
    const isWin = fromCell.height === 2 && toCell.height === 3;

    return {
      success: true,
      isWin,
      winner: isWin ? playerId : undefined,
      lastMovedWorkerId: workerId,
      lastMovedWorkerPosition: position
    };
  }

  private applyBuild(move: BuildMove): MoveResult {
    const { position, buildingType } = move;
    
    if (this.isPositionOccupied(position.x, position.y)) {
      return { success: false, error: 'Cannot build on occupied position' };
    }

    const cell = this._cells[position.x][position.y];
    
    if (cell.hasDome) {
      return { success: false, error: 'Cannot build on dome' };
    }

    if (buildingType === 'dome') {
      cell.hasDome = true;
    } else {
      if (cell.height >= 3) {
        return { success: false, error: 'Cannot build above level 3' };
      }
      cell.height++;
    }

    return { success: true };
  }

  private isValidWorkerMove(from: Position, to: Position, playerId: PlayerId, workerId: number): boolean {
    // Check if worker exists at from position
    const fromCell = this._cells[from.x][from.y];
    if (!fromCell.worker || fromCell.worker.playerId !== playerId || fromCell.worker.workerId !== workerId) {
      return false;
    }

    // Check if destination is valid and not occupied
    if (this.isPositionOccupied(to.x, to.y)) {
      return false;
    }

    // Check adjacency (can only move to adjacent cells)
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    if (dx > 1 || dy > 1 || (dx === 0 && dy === 0)) {
      return false;
    }

    // Check height difference (can only move up 1 level)
    const fromHeight = fromCell.height;
    const toHeight = this._cells[to.x][to.y].height;
    if (toHeight > fromHeight + 1) {
      return false;
    }

    // Check for dome
    if (this._cells[to.x][to.y].hasDome) {
      return false;
    }

    return true;
  }
}

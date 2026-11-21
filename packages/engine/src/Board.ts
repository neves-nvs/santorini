/**
 * The cells of the board, as the server and the view read them. The rules work on the same data as plain JSON
 * (`BoardSnapshot`, see rules.ts).
 */

import { isBoardCoordinate } from "./Move.ts";
import { Seat } from "./types.ts";

export interface WorkerRef {
  seat: Seat;
  workerId: number;
}

export interface BoardCell {
  height: number; // 0-3 (building levels)
  hasDome: boolean;
  worker?: WorkerRef;
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
  private constructor(private _cells: BoardCell[][]) {}

  static createEmpty(): Board {
    return Board.fromSnapshot(null);
  }

  static fromSnapshot(snapshot: BoardSnapshot | null): Board {
    const cells: BoardCell[][] = [];

    for (let x = 0; x < 5; x++) {
      cells[x] = [];
      for (let y = 0; y < 5; y++) {
        const cellData = snapshot?.cells?.[x]?.[y] || { height: 0, hasDome: false, worker: null };

        cells[x][y] = {
          height: cellData.height || 0,
          hasDome: cellData.hasDome || false,
          worker: cellData.worker ? { seat: cellData.worker.seat, workerId: cellData.worker.workerId } : undefined,
        };
      }
    }

    return new Board(cells);
  }

  get cells(): ReadonlyArray<ReadonlyArray<BoardCell>> {
    return this._cells;
  }

  getCell(x: number, y: number): BoardCell | null {
    return isBoardCoordinate(x) && isBoardCoordinate(y) ? this._cells[x][y] : null;
  }

  toSnapshot(): BoardSnapshot {
    return {
      cells: this._cells.map((column) =>
        column.map((cell) => ({
          height: cell.height,
          hasDome: cell.hasDome,
          worker: cell.worker ? { seat: cell.worker.seat, workerId: cell.worker.workerId } : null,
        })),
      ),
    };
  }
}

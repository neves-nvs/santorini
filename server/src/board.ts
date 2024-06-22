export class Board {
  private board: Stack[][];
  private workers: Worker[];

  constructor() {
    this.board = this.initializeBoard();
    this.workers = [];
  }

  private initializeBoard(): Stack[][] {
    return Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => new Stack()),
    );
  }

  getEmptyPositions(): Position[] {
    const emptyPositions: Position[] = [];
    this.board.forEach((row, y) => {
      row.forEach((stack, x) => {
        if (stack.isEmpty()) {
          emptyPositions.push({ x, y });
        }
      });
    });
    return emptyPositions;
  }
}

export class Player {
  private username: string;
  private workers: Worker[];

  constructor(username: string) {
    this.username = username;
    this.workers = [];
  }

  getUsername(): string {
    return this.username;
  }
}

export class Stack {
  // Rules
  // 1. No piece on top of worker
  // 2. No piece on top of dome
  private pieces: PieceType[];

  constructor() {
    this.pieces = [];
  }

  push(piece: PieceType) {
    this.pieces.push(piece);
  }

  pop() {
    return this.pieces.pop();
  }

  peek(): PieceType {
    return this.pieces[this.pieces.length - 1];
  }

  isEmpty(): boolean {
    return this.pieces.length === 0;
  }

  getPieces(): PieceType[] {
    return this.pieces;
  }
}

export interface Position {
  x: number;
  y: number;
}

export class Worker {
  private id: number;
  private position: Position;

  constructor(id: number, position: Position) {
    this.id = id;
    this.position = position;
  }

  setPosition(position: Position) {
    this.position = position;
  }

  getId(): number {
    return this.id;
  }
}

export enum PieceType {
  BASE = 0,
  MID = 1,
  TOP = 2,
  DOME = 3,
  BUILDER = 4,
}

const MAX_BASE_COUNT = 22;
const MAX_MID_COUNT = 18;
const MAX_TOP_COUNT = 14;
const MAX_DOME_COUNT = 18;

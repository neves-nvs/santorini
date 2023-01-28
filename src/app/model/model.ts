import { PieceType } from "../view/piece3D";

export class Position {
  x: number;
  y: number;

  constructor(x: number, y: number) { [this.x, this.y] = [x, y]; }

  destructure() { return [this.x, this.y]; }
}

export enum Clickable { SPACE, BUILDER }

export class Board {
  squares: Space[][];
  SIZE = 5;

  constructor() {
    this.squares = new Array<Space[]>(5);

    for (let x = 0; x < this.SIZE; x++) {
      this.squares[x] = new Array<Space>(5);
      for (let y = 0; y < this.SIZE; y++) {
        this.squares[x][y] = new Space();
      }
    }
  }

  adjacent(position: Position): Position[] {
    let [x, y] = position.destructure();

    let adjacent: Position[] = [];

    // top left boundary
    if (x > 0 && y > 0) adjacent.push(new Position(x - 1, y - 1));
    // left boundary
    if (x > 0) adjacent.push(new Position(x - 1, y));
    // left bottom boundary
    if (x > 0 && y < 4) adjacent.push(new Position(x - 1, y + 1));

    // bottom boundary
    if (y < 4) adjacent.push(new Position(x, y + 1));
    // bottom right boundary
    if (x < 4 && y < 4) adjacent.push(new Position(x + 1, y + 1));

    // right boundary
    if (x < 4) adjacent.push(new Position(x + 1, y));
    // right top boundary
    if (x < 4 && y > 0) adjacent.push(new Position(x + 1, y - 1));

    // top boundary
    if (y > 0) adjacent.push(new Position(x, y - 1));

    return adjacent;
  }

  size(position: Position): number {
    let [x, y] = position.destructure();
    return this.squares[x][y].size();
  }

  place(position: Position) {
    let [x, y] = position.destructure();
    let square = this.squares[x][y];

    let squareIsNotEmpty = (square.size() !== 0);
    if (squareIsNotEmpty) throw new Error('[place] Square is not empty');

    square.place();
  }

  move(builderPosition: Position, position: Position) {
    let [old_x, old_y] = builderPosition.destructure();
    let fromSquare = this.squares[old_x][old_y];
    fromSquare.remove();

    let [new_x, new_y] = position.destructure();
    let toSquare = this.squares[new_x][new_y];
    toSquare.place()
  }

  build(position: Position) {
    let [x, y] = position.destructure();
    let square: Space = this.squares[x][y];

    square.build();
  }

  available(position: Position) {
    let [x, y] = position.destructure();
    let square: Space = this.squares[x][y];

    return !(Clickable.BUILDER in square.elements);
  }
}

class Space {
  elements: PieceType[] = [];

  size() {
    return this.elements.length;
  }

  place() {
    this.elements.push(PieceType.Builder);
    console.log(this.elements);
  }

  remove() {
    let optPiece = this.elements.pop();
    if (optPiece == undefined) {
      throw Error('[remove] no pieces in square')
    }
    let piece: PieceType = optPiece;
    if (piece != PieceType.Builder) {
      this.elements.push(piece);
      throw Error('[remove] removing piece that inst a builder');
    }
  }

  build() {
    this.elements.push(PieceType.Block)
  }
}





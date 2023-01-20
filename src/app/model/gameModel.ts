import { SelectableType } from "../view/selectable";

export class Position {
  x: number;
  y: number;

  constructor(x: number, y: number) { [this.x, this.y] = [x, y]; }

  destructure() { return [this.x, this.y]; }
}

export enum Clickable { SPACE, BUILDER }

export class GameModel {
  board = new Board();

  place(position: Position) {
    this.board.place(position);
  }
}

class Board {
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

  available(position: Position) {
    let [x, y] = position.destructure();
    return !(SelectableType.Builder in this.squares[x][y]);
  }

  height(position: Position): number {
    let [x, y] = position.destructure();
    return this.squares[x][y].height();
  }

  place(position: Position) {
    let [x, y] = position.destructure();
    let square: Space = this.squares[x][y];

    let squareIsNotEmpty = square.height() == 0;
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
}

class Space {
  elements: SelectableType[] = [];

  height() {
    return this.elements.length;
  }

  place() {
    this.elements.push(SelectableType.Builder)
  }

  remove() {
    let optPiece = this.elements.pop();
    if (optPiece == undefined) {
      throw Error('[remove] no pieces in square')
    }
    let piece: SelectableType = optPiece;
    if (piece != SelectableType.Builder) {
      this.elements.push(piece);
      throw Error('[remove] removing piece that inst a builder');
    }
  }

  build() {
    this.elements.push(SelectableType.Block)
  }
}





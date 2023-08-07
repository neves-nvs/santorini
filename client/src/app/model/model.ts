import Position from "../common/position";
import {BlockType, PieceType} from "../common/objects";

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

    let builder: PieceType = 'BUILDER';
    square.add(builder);
  }

  move(builderPosition: Position, position: Position) {
    let [old_x, old_y] = builderPosition.destructure();
    let fromSquare = this.squares[old_x][old_y];
    let builder = fromSquare.remove();

    let [new_x, new_y] = position.destructure();
    let toSquare = this.squares[new_x][new_y];

    toSquare.add(builder);
  }

  build(position: Position) {
    let [x, y] = position.destructure();
    let square: Space = this.squares[x][y];

    let block: BlockType = 'BLOCK';
    square.add(block);
  }

  available(position: Position) {
    let [x, y] = position.destructure();
    let square: Space = this.squares[x][y];

    return !('BUILDER' in square.elements);
  }
}

class Space {
  elements: PieceType[] = [];

  size() {
    return this.elements.length;
  }

  add(piece: PieceType) {
    this.elements.push(piece);
  }

  remove(): PieceType {
    let optPiece = this.elements.pop();
    if (optPiece == undefined) {
      throw Error('[remove] no pieces in square')
    }
    let piece: PieceType = optPiece;
    if (piece != 'BUILDER') {
      this.elements.push(piece);
      throw Error('[remove] removing piece that inst a builder');
    }

    return piece
  }
}





import { BoxGeometry, Mesh, MeshBasicMaterial, Object3D } from "three";

import Piece from "./Piece";
import { SpaceShade } from "../BoardManager";

export default class Stack extends Object3D {
  private pieces: Piece[];
  private height: number;

  constructor(type: SpaceShade) {
    super();
    this.pieces = [];
    this.height = this.pieces.length; // TODO
    this.addFloorTile(type);
  }

  private addFloorTile(type: SpaceShade) {
    const size: number = 0.969;
    const square = new BoxGeometry(size, 0, size);
    const color = new MeshBasicMaterial({ color: type });
    let mesh = new Mesh(square, color);
    mesh.position.setY(-0.05);
    this.add(mesh);
  }
  getPieces(): Piece[] {
    return this.pieces;
  }

  addPiece(piece: Piece) {
    //raises current "floor lever"
    piece.position.setY(this.height);
    this.height += piece.getHeight();
  }

  removePiece(): Piece | undefined {
    let piece: Piece | undefined = this.pieces.pop();
    return piece;
  }
}

import { BoxGeometry, Mesh, MeshBasicMaterial, Object3D } from "three";

import Piece from "./Piece";
import { SpaceShade } from "../BoardManager";

export default class Stack extends Object3D {
  private pieces: Piece[] = [];
  private height = 0;

  constructor(type: SpaceShade) {
    super();
    this.addFloorTile(type);
  }

  private addFloorTile(type: SpaceShade) {
    const size: number = 0.969;
    const square = new BoxGeometry(size, 0, size);
    const color = new MeshBasicMaterial({ color: type });
    const mesh = new Mesh(square, color);
    mesh.position.setY(-0.05);
    this.add(mesh);
  }
  getPieces(): Piece[] {
    return this.pieces;
  }

  addPiece(piece: Piece) {
    piece.position.setX(this.position.x);
    piece.position.setZ(this.position.z);

    piece.position.setY(this.height);

    this.height += piece.getHeight();
    this.pieces.push(piece);
  }

  removePiece(): Piece | undefined {
    const piece = this.pieces.pop();
    return piece;
  }
}

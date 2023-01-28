import { BoxGeometry, Group, Material, Mesh, MeshBasicMaterial } from "three";

import { Piece3D, PieceType } from "./piece3D";

import Button from "./button";
import { Play } from "../model/gameManager";

export enum SpaceType {
  Light = 0x51a832,
  Dark = 0x265c13,
}

export class Space3D extends Group implements Button {
  mesh: Mesh;
  play?: Play;
  visible: boolean;
  height: number = 0;
  pieces: Piece3D[] = [];

  constructor(type: SpaceType) {
    super();
    this.addFloorTile(type);

    const material = new MeshBasicMaterial({
      color: "blue",
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    let geometry = new BoxGeometry(0.8, 0.3, 0.8);
    const mesh = new Mesh(geometry, material);
    this.mesh = mesh;
    this.add(mesh);

    this.visible = true;
  }

  addPiece(type: PieceType): Piece3D {
    const piece = new Piece3D(type, true);
    this.pieces.push(piece);
    this.add(piece);

    //raises current "floor lever"
    piece.position.setY(this.height);
    this.height += piece.height;

    return piece;
  }

  setPlay(play: Play){
    this.play = play;
  }

  movePiece(space: Space3D) {
    let len: number = space.pieces.length;

    if (this.pieces.length == 4) return;

    // TODO return if moving up more than 2 and dont return it in availability

    if (len > 0) {
      let piece: Piece3D = space.pieces[len - 1];
      if (piece.Type == PieceType.Builder) {
        piece.position.setY(this.height);
        // three js
        space.remove(piece);
        this.add(piece);

        // height for addPiece()
        space.height -= piece.height;
        this.height += piece.height;

        // logic array
        space.pieces = space.pieces.filter((p) => p != piece);
        this.pieces.push(piece);
      }
    }
  }

  build() {
    const piece = this.pieces.length;
    switch (piece) {
      case 0:
        this.addPiece(PieceType.Base);
        break;
      case 1:
        this.addPiece(PieceType.Mid);
        break;
      case 2:
        this.addPiece(PieceType.Top);
        break;
      case 3:
        this.addPiece(PieceType.Dome);
        break;
      default:
        console.log("space3D.ts | build() | Building too high");
    }
    this.mesh.position.setY(this.height);
  }

  available(): boolean {
    if (this.pieces.length > 3) return false;
    if (this.pieces.length > 0)
      return !(this.pieces[this.pieces.length - 1].Type == PieceType.Builder);
    return true;
  }

  hover(): void {
    if (this.visible){
      (this.mesh.material as Material).opacity = 0.8;
    }
  }

  reset() {
    if (this.visible) (this.mesh.material as Material).opacity = 0.2;
    else (this.mesh.material as Material).opacity = 0;
  }

  click(): Play | undefined {
    return this.play;
  }

  update(delta: number) {
    this.reset();
    this.pieces.forEach(p => p.reset());
    if (delta == 0) return // just avoiding linting
  }

  private addFloorTile(type: SpaceType) {
    const size: number = 0.969;
    const square = new BoxGeometry(size, 0, size);
    const color = new MeshBasicMaterial({ color: type });
    let mesh = new Mesh(square, color);
    mesh.position.setY(-0.05);
    this.add(mesh);
  }
}

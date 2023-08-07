import { BoxGeometry, Object3D, Material, Mesh, MeshBasicMaterial } from "three";

import { Piece3D } from "./piece3D";
import Button from "./button";
import { ButtonType, PieceType } from "../common/objects";

export enum SpaceShade {
  Light = 0x51a832,
  Dark = 0x265c13,
}

export class Space3D extends Object3D implements Button {
  mesh: Mesh;
  type: ButtonType;
  active: boolean = false;

  height: number = 0;
  pieces: Piece3D[] = [];

  constructor(shade: SpaceShade)  {
    super()
    this.addFloorTile(shade);

    this.type = "SPACE";
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
  }

  private addFloorTile(type: SpaceShade) {
    const size: number = 0.969;
    const square = new BoxGeometry(size, 0, size);
    const color = new MeshBasicMaterial({ color: type });
    let mesh = new Mesh(square, color);
    mesh.position.setY(-0.05);
    this.add(mesh);
  }


  update(delta: number) {
    this.reset();
    this.pieces.forEach(p => p.update());
    if (delta == 0) return // just avoiding linting
  }

  addPiece(type: PieceType): Piece3D {
    const piece = new Piece3D(type);
    this.pieces.push(piece);
    this.add(piece);

    //raises current "floor lever"
    piece.position.setY(this.height);
    this.height += piece.height;

    return piece;
  }

  place(piece: Piece3D){
    console.log(piece);
  }

  movePiece(space: Space3D) {
    let len: number = space.pieces.length;

    if (this.pieces.length == 4) return;

    // TODO return if moving up more than 2 and dont return it in availability

    if (len > 0) {
      let piece: Piece3D = space.pieces[len - 1];
      if (piece.type == 'BUILDER') {
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
        this.addPiece('BASE');
        break;
      case 1:
        this.addPiece('MID');
        break;
      case 2:
        this.addPiece('TOP');
        break;
      case 3:
        this.addPiece('BUILDER');
        break;
      default:
        console.log("space3D.ts | build() | Building too high");
    }
    this.mesh.position.setY(this.height);
  }

  getBuilder(): Piece3D | undefined {
    return this.pieces.find(p => p.type == 'BUILDER');
  }

  getSelectableButtons(): Button[] {
    return this.pieces //.filter(b => b.play != undefined);
  }

  hover(): void {
    (this.mesh.material as Material).opacity = 0.8;
  }

  reset() {
    //if (this.play == undefined) (this.mesh.material as Material).opacity = 0;
    //else 
    (this.mesh.material as Material).opacity = 0.2;
  }

}

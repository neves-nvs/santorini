import {Mesh, BoxGeometry, MeshBasicMaterial, Group, Vector2, Material} from "three";

import {Piece, PieceType} from "./piece";

import {Selectable} from "./selectable";

export enum SpaceType {
  Light= 0x609130,
  Dark = 0x437314
}

export class Space extends Group implements Selectable{
  height: number = 0;
  grid_position: Vector2;
  pieces: Piece[] = new Array<Piece>();
  selectable: boolean = true;
  mesh: Mesh;

  constructor(type: SpaceType, grid_position: Vector2) {
    super();
    this.addFloorTile(type);

    const material = new MeshBasicMaterial( {color: "blue", transparent: true, opacity: 0, depthWrite: false} );
    let geometry = new BoxGeometry( 0.8, 0.3, 0.8 );
    const mesh = new Mesh(geometry, material);
    this.mesh = mesh;
    this.add(mesh);

    this.grid_position = grid_position;
  }

  /**
   * Receives PieceType, creates piece of that type and places it correctly
   * @param type: PieceType
   */
  addPiece(type: PieceType): Piece {
    const piece = new Piece(type, this.grid_position);
    this.pieces.push(piece);
    this.add(piece);

    //raises current "floor lever"
    piece.position.setY(this.height);
    this.height += piece.height;

    return piece
  }

  //TODO decide whether new position "steals" from previous or vice-versa
  movePiece(space: Space, piece: Piece){
    space.remove(piece);
    this.add(piece);
    this.height -= piece.height;

  }

  available(): boolean{
    if (this.pieces.length > 0) return !this.pieces[this.pieces.length-1].selectable;
    return true;
  }

  showButton(){
    console.log("MOSTRAR BOTÃO: Espaço [" + this.grid_position.x + "][" + this.grid_position.y + "]");
    if (this.mesh.material instanceof Material) {
      this.mesh.material.opacity = 0.2;
    }
  }

  hideButton(){
    if (this.mesh.material instanceof Material) {
      this.mesh.material.opacity = 0;
    }
  }

  dim(){
    (this.mesh.material as Material).opacity = 0.8;
  }

  deDim(){
    (this.mesh.material as Material).opacity = 0.2;
  }

  /**
   *
   * @private
   */
  private addFloorTile(type: SpaceType){
    const square = new BoxGeometry(1, 0.1, 1);
    const color = new MeshBasicMaterial({ color: type });
    let mesh = new Mesh(square, color);
    mesh.position.setY(-0.05);
    this.add(mesh);
  }

}

import {BoxGeometry, Group, Material, Mesh, MeshBasicMaterial} from "three";

import {Piece, PieceType} from "./piece";

import {Selectable, SelectableType} from "./selectable";

export enum SpaceType {
  Light= 0x609130,
  Dark = 0x437314
}

export class Space extends Group implements Selectable{
  mesh: Mesh;
  sel_type = SelectableType.Space;
  x: number;
  y: number;

  height: number = 0;
  pieces: Piece[] = [];

  constructor(type: SpaceType, x: number, y: number) {
    super();
    this.addFloorTile(type);

    const material = new MeshBasicMaterial( {color: "blue", transparent: true, opacity: 0, depthWrite: false} );
    let geometry = new BoxGeometry( 0.8, 0.3, 0.8 );
    const mesh = new Mesh(geometry, material);
    this.mesh = mesh;
    this.add(mesh);

    this.x = x;
    this.y = y
  }

  /**
   * Receives PieceType, creates piece of that type and places it correctly
   * @param type: PieceType
   */
  addPiece(type: PieceType): Piece {
    const piece = new Piece(type, this.x, this.y);
    this.pieces.push(piece);
    this.add(piece);

    //raises current "floor lever"
    piece.position.setY(this.height);
    this.height += piece.height;

    return piece
  }

  //TODO decide whether new position "steals" from previous or vice-versa
  movePiece(space: Space){
    let len: number = space.pieces.length;
    if (len > 0 ){
      let piece: Piece = space.pieces[len - 1];
      if (piece.Type == PieceType.Builder){
        // three js
        space.remove(piece);
        this.add(piece);

        // height for addPiece()
        space.height -= piece.height;
        this.height += piece.height;

        // logic array
        space.pieces = space.pieces.filter( p => p != piece);
        this.pieces.push(piece);

        // piece's new coordinates
        piece.x = this.x;
        piece.y = this.y;
      }
    }
  }

  available(): boolean{
    if (this.pieces.length > 0) return !(this.pieces[this.pieces.length-1].Type == PieceType.Builder);
    return true;
  }

  showButton(){
    (this.mesh.material as Material).opacity = 0.2;

  }

  hideButton(){
    (this.mesh.material as Material).opacity = 0;
  }

  dim(){
    (this.mesh.material as Material).opacity = 0.8;
  }

  deDim(){
    (this.mesh.material as Material).opacity = 0.2;
  }

  onClick(): Selectable | undefined { return undefined }

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

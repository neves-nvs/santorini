import {
  BufferGeometry,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D
} from "three";

import {baseGeometry, builderGeometry, midGeometry, topGeometry} from "./stlloader";

import {Selectable, SelectableType} from "./selectable";

export class Piece extends Object3D implements Selectable{
  mesh: Mesh;
  sel_type = SelectableType.Block;
  x: number;
  y: number;

  Type: number;
  height: number = 0;

  constructor(type: PieceType, x:number, y:number) {
    super();

    this.mesh = new Mesh(); // TODO fix
    this.Type = type;
    this.x = x;
    this.y = y;

    // ugly fixe TODO
    let Yoffset: number = 0;
    let Xrotation: number = 0;
    let color: number = 0xCCCCCC;

    let geometry: BufferGeometry = new BufferGeometry();
    switch (type) {
      case PieceType.Builder:
        this.sel_type = SelectableType.Builder;
        color = 0x3260a8;
        geometry = builderGeometry;
        Yoffset = 0.47;
        Xrotation = -Math.PI / 2;
        break;
      case PieceType.Base:
        geometry = baseGeometry;
        Yoffset = 0.3;
        Xrotation = -Math.PI / 2;
        break;
      case PieceType.Mid:
        geometry = midGeometry;
        Yoffset = 0.275;
        Xrotation = -Math.PI / 2;
        break;
      case PieceType.Top:
        geometry = topGeometry;
        Xrotation = Math.PI / 2;
        break;
      case PieceType.Dome:
        Yoffset = 0.165;
        break;

      default:
        console.log("Invalid piece type");
    }

    this.height = 2 * Yoffset;

    let material = new MeshStandardMaterial({color: color, transparent: true});
    geometry.center();
    this.mesh = new Mesh(geometry, material);
    let scale = 0.03;
    this.mesh.position.setY(Yoffset);
    this.mesh.scale.set(scale, scale, scale);
    this.mesh.rotateX(Xrotation);

    this.add(this.mesh);
  }

  dim(){
    (this.mesh.material as Material).transparent = true;
    (this.mesh.material as Material).opacity = 0.5;
  }

  deDim(){
    (this.mesh.material as Material).transparent = false;
    (this.mesh.material as Material).opacity = 1;
  }

  onClick(): Selectable | undefined {
    return (this as Selectable);
  }
}

// TODO interface for every other piecetype to add method to build a playable space
export enum PieceType {
  Builder,
  Base,
  Mid,
  Top,
  Dome,
}

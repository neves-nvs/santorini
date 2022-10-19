import {
  BufferGeometry,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from "three";

import {
  STLImportConfig,
  builderGeometry,
  baseGeometry,
  midGeometry,
  topGeometry,
  domeGeometry,
} from "../assets_loader/stlloader";

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

    let config: STLImportConfig = new STLImportConfig(0, 0, 0.03);
    let color: number = 0xCCCCCC;

    let geometry: BufferGeometry = new BufferGeometry();
    switch (type) {
      case PieceType.Builder:
        this.sel_type = SelectableType.Builder;
        geometry = builderGeometry;
        config = new STLImportConfig(0.47, -Math.PI / 2, 0.03);
        color = 0x3260a8;
        break;
      case PieceType.Base:
        geometry = baseGeometry;
        config = new STLImportConfig(0.231, -Math.PI / 2, 0.028);
        break;
      case PieceType.Mid:
        geometry = midGeometry;
        config = new STLImportConfig(0.275, -Math.PI / 2, 0.028);
        break;
      case PieceType.Top:
        geometry = topGeometry;
        config = new STLImportConfig(0.165, Math.PI / 2, 0.028);
        break;
      case PieceType.Dome:
        geometry = domeGeometry;
        config = new STLImportConfig(0.1, -Math.PI / 2, 0.0165);
        break;
      default:
        console.log("Invalid piece type");
    }

    this.height = 2 * config.y_offset;

    const material = new MeshStandardMaterial({color: color, transparent: true});
    geometry.center();
    this.mesh = new Mesh(geometry, material);
    this.mesh.position.setY(config.y_offset);
    this.mesh.scale.set(config.scale, config.scale, config.scale);
    this.mesh.rotateX(config.x_rotation);

    this.add(this.mesh);
  }

  highlight(){
    (this.mesh.material as Material).opacity = 0.5;
  }

  normal(){
    (this.mesh.material as Material).opacity = 1;
  }

  reset(){
    (this.mesh.material as Material).opacity = 1;
  }

  onClick(): Selectable | undefined {
    return (this as Selectable);
  }
}

export enum PieceType {
  Builder,
  Base,
  Mid,
  Top,
  Dome,
}

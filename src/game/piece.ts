import { BufferGeometry, Material, Mesh, MeshPhongMaterial, Object3D, Vector2 } from "three";

import { builderGeometry, baseGeometry, midGeometry, topGeometry} from "./stlloader";

export class Piece extends Object3D {
  mesh: Mesh;
  Type: number;
  height: number = 0;
  selectable: boolean = false;
  grid_location: Vector2;

  constructor(type: PieceType, grid_location: Vector2) {
    super();

    this.mesh = new Mesh(); // TODO fix
    this.Type = type;
    this.selectable = false;
    this.grid_location = grid_location;

    // ugly fixe TODO
    let Yoffset: number = 0;
    let Xrotation: number = 0;

    let geometry: BufferGeometry = new BufferGeometry();
    switch (type) {
      case PieceType.Builder:
        this.selectable = true;
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

    let material = new MeshPhongMaterial({color: 0xffffff, transparent: true});
    geometry.center();
    this.mesh = new Mesh(geometry, material);
    let scale = 0.03;
    this.mesh.position.setY(Yoffset);
    this.mesh.scale.set(scale, scale, scale);
    this.mesh.rotateX(Xrotation);
    console.log(this.mesh);

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
}

// TODO interface for every other piecetype to add method to build a playable space
export enum PieceType {
  Builder,
  Base,
  Mid,
  Top,
  Dome,
}

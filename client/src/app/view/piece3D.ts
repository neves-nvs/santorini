import {
  BufferGeometry,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from "three";

import {
  STLImportConfig,
  locations,
  stlloader,
} from "./stlloader";

import Button from "./button";
import { ButtonType, PieceType } from "../common/objects";

let counter: number = 0;

export class Piece3D extends Object3D implements Button {
  mesh: Mesh;
  type: ButtonType;
  active: boolean = false;

  height: number = 0;

  constructor(type: PieceType) {
    super();

    this.mesh = new Mesh();

    this.type = type;

    let config: STLImportConfig = new STLImportConfig(0, 0, 0.03);
    let color: number = 0xcccccc;
    let location: string = "";

    switch (type) {
      case 'BUILDER':
        location = locations["builder"];
        config = new STLImportConfig(0.47, -Math.PI / 2, 0.03);
        color = counter % 2 == 0 ? 0x3260a8 : 0xf56642;
        counter++;
        break;

      case 'BASE':
        location = locations["base"];
        config = new STLImportConfig(0.231, -Math.PI / 2, 0.028);
        break;

      case 'MID':
        location = locations["mid"];
        config = new STLImportConfig(0.275, -Math.PI / 2, 0.028);
        break;

      case 'TOP':
        location = locations["top"];
        config = new STLImportConfig(0.165, Math.PI / 2, 0.028);
        break;

      case 'DOME': 
        location = locations["dome"];
        config = new STLImportConfig(0.1, -Math.PI / 2, 0.0165);
        break;

      default:
        console.error("Invalid piece type");
    }
    this.height = 2 * config.y_offset;

    let geometry: BufferGeometry;
    stlloader.load(
      location, g => {
        geometry = g;
        const material = new MeshStandardMaterial({
          color: color,
          transparent: true,
        });
        geometry.center();
        this.mesh = new Mesh(geometry, material);
        this.mesh.position.setY(config.y_offset);
        this.mesh.scale.set(config.scale, config.scale, config.scale);
        this.mesh.rotateX(config.x_rotation);

        this.add(this.mesh);
      }
    );
  }

  update(){
    this.reset();
  }

  hover(){
    //if (this.play != undefined){
    (this.mesh.material as Material).opacity = 0.5;
    //}
  }

  reset() {
    (this.mesh.material as Material).opacity = 1;
  }

}

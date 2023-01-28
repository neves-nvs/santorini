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
import { Clickable } from "../model/model";
import { Play } from "../model/gameManager";

let counter: number = 0;

export class Piece3D extends Object3D implements Button {
  mesh: Mesh;
  sel_type?: Clickable;
  play?: Play;
  visible: boolean;

  Type: number;
  height: number = 0;

  constructor(type: PieceType, visible: boolean) {
    super();

    this.mesh = new Mesh();
    this.visible = visible;

    this.Type = type;

    let config: STLImportConfig = new STLImportConfig(0, 0, 0.03);
    let color: number = 0xcccccc;
    let location: string = "";

    switch (type) {
      case PieceType.Builder:
        this.sel_type = Clickable.BUILDER;
        location = locations["builder"];
        config = new STLImportConfig(0.47, -Math.PI / 2, 0.03);
        color = counter % 2 == 0 ? 0x3260a8 : 0xf56642;
        counter++;
        break;

      case PieceType.Base:
        location = locations["base"];
        config = new STLImportConfig(0.231, -Math.PI / 2, 0.028);
        break;

      case PieceType.Mid:
        location = locations["mid"];
        config = new STLImportConfig(0.275, -Math.PI / 2, 0.028);
        break;

      case PieceType.Top:
        location = locations["top"];
        config = new STLImportConfig(0.165, Math.PI / 2, 0.028);
        break;

      case PieceType.Dome:
        location = locations["dome"];
        config = new STLImportConfig(0.1, -Math.PI / 2, 0.0165);
        break;

      default:
        console.log("Invalid piece type");
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

  hover(){
    if (this.visible){
      (this.mesh.material as Material).opacity = 0.5;
    }
  }

  reset() {
    if (this.visible) (this.mesh.material as Material).opacity = 1;
    else (this.mesh.material as Material).opacity = 1;
  }

  click(): Play | undefined {
    return this.play;
  }

  setPlay(play: Play) {
    this.play = play;
  }
}

export enum PieceType {
  Builder,
  Base, Mid, Top,
  Block,
  Dome,
}

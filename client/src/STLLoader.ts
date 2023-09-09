import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

export class STLImportConfig {
  y_offset: number = 0;
  x_rotation: number = 0;
  scale: number = 0.03;
  constructor(y_offset: number, x_rotation: number, scale: number) {
    this.y_offset = y_offset;
    this.x_rotation = x_rotation;
    this.scale = scale;
  }
}

export const locations = {
  builder: "assets/Builder.stl",
  base: "assets/Base.stl",
  mid: "assets/Mid.stl",
  top: "assets/Top.stl",
  dome: "assets/Dome.stl",
  board: "assets/Board.stl",
};

export const stlloader = new STLLoader();

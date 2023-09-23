import { Mesh, MeshStandardMaterial, Vector3 } from "three";

import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

type PieceModel = "BUILDER" | "BASE" | "MID" | "TOP" | "DOME" | "BOARD";

interface ModelLoader {
  load(model: PieceModel): Mesh;
}

// class STLFileLoader implements ModelLoader {
//   constructor() {}
//   load(model: PieceModel): Mesh {
//     let config: STLImportConfig;
//     switch (model) {
//       case "BUILDER":
//         config = configs.builder;
//         break;

//       case "BASE":
//         config = configs.base;
//         break;

//       case "MID":
//         config = configs.mid;
//         break;

//       case "TOP":
//         config = configs.top;
//         break;

//       case "DOME":
//         config = configs.dome;
//         break;

//       default:
//         console.error("Invalid piece type");
//     }
//   }
// }

export class STLImportConfig {
  y_offset: number = 0;
  x_rotation: number = 0;
  scale: number = 0.03;
  file: string = "";
  constructor(
    file: string,
    y_offset: number,
    x_rotation: number,
    scale: number,
  ) {
    this.file = file;
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

export const configs = {
  builder: new STLImportConfig(locations.builder, 0.47, -Math.PI / 2, 0.03),
  base: new STLImportConfig(locations.base, 0.231, -Math.PI / 2, 0.028),
  mid: new STLImportConfig(locations.mid, 0.275, -Math.PI / 2, 0.028),
  top: new STLImportConfig(locations.top, 0.165, Math.PI / 2, 0.028),
  dome: new STLImportConfig(locations.dome, 0.1, -Math.PI / 2, 0.0165),
  board: new STLImportConfig(locations.board, 0, -Math.PI / 2, 0.031747), // todo fix
};

export const stlloader = new STLLoader();

const boardGeometry = await stlloader.loadAsync(locations.board);
boardGeometry.center();
const material = new MeshStandardMaterial({ color: "white" });
const mesh = new Mesh(boardGeometry, material);

const scale = 0.031747;
mesh.scale.set(scale, scale, scale);
mesh.rotateX(-Math.PI / 2);
mesh.position.set(0, -0.067, 0);
mesh.position.add(new Vector3(2, 0, 2));
export let boardMesh = mesh;

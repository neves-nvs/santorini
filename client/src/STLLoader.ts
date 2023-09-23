import { Mesh, MeshStandardMaterial, Vector3 } from "three";

import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

enum PieceModel {
  BUILDER,
  BASE,
  MID,
  TOP,
  DOME,
  BOARD,
}

interface ModelLoader {
  load(model: PieceModel): Mesh;
}
export class STLImportConfig {
  y_offset: number;
  x_rotation: number;
  scale: number;
  file: string;
  
  constructor(file: string, y_offset: number, x_rotation: number, scale: number) {
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
  board: new STLImportConfig(locations.board, -0.067, -Math.PI / 2, 0.031747),
};

export const stlloader = new STLLoader();

function applyImportSettings(mesh: Mesh, config: STLImportConfig) {
  mesh.rotateX(config.x_rotation);
  mesh.position.y += config.y_offset;
  mesh.scale.set(config.scale, config.scale, config.scale);
}

const material = new MeshStandardMaterial({ color: "white" });
let mesh;

const [
  boardGeometry,
  builderGeometry,
  baseGeometry,
  midGeometry,
  topGeometry,
  domeGeometry
] = await Promise.all([
  stlloader.loadAsync(configs.board.file),
  stlloader.loadAsync(configs.builder.file),
  stlloader.loadAsync(configs.base.file),
  stlloader.loadAsync(configs.mid.file),
  stlloader.loadAsync(configs.top.file),
  stlloader.loadAsync(configs.dome.file)
]);

boardGeometry.center();
mesh = new Mesh(boardGeometry, material);
applyImportSettings(mesh, configs.board);
mesh.position.add(new Vector3(2, 0, 2));
export let boardMesh = mesh;

builderGeometry.center();
mesh = new Mesh(builderGeometry, material);
applyImportSettings(mesh, configs.builder);
export let builderMesh = mesh;

baseGeometry.center();
mesh = new Mesh(baseGeometry, material);
applyImportSettings(mesh, configs.base);
export let baseMesh = mesh;

midGeometry.center();
mesh = new Mesh(midGeometry, material);
applyImportSettings(mesh, configs.mid);
export let midMesh = mesh;

topGeometry.center();
mesh = new Mesh(topGeometry, material);
applyImportSettings(mesh, configs.top);
export let topMesh = mesh;

domeGeometry.center();
mesh = new Mesh(domeGeometry, material);
applyImportSettings(mesh, configs.dome);
export let domeMesh = mesh;

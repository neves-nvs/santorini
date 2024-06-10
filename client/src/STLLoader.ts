import { Box3, Mesh, MeshStandardMaterial, Vector3 } from "three";

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
  constructor(
    public file: string,
    public y_offset: number,
    public x_rotation: number,
    public scale: number,
  ) {}
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
  builder: new STLImportConfig(locations.builder, 0.28, -Math.PI / 2, 0.02),
  base: new STLImportConfig(locations.base, 0.231, -Math.PI / 2, 0.028),
  mid: new STLImportConfig(locations.mid, 0.236, -Math.PI / 2, 0.028),
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
  domeGeometry,
] = await Promise.all([
  stlloader.loadAsync(configs.board.file),
  stlloader.loadAsync(configs.builder.file),
  stlloader.loadAsync(configs.base.file),
  stlloader.loadAsync(configs.mid.file),
  stlloader.loadAsync(configs.top.file),
  stlloader.loadAsync(configs.dome.file),
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
const boundingBox = new Box3().setFromObject(mesh);
const height = boundingBox.max.y - boundingBox.min.y;
console.log("Height of top piece: ", height);

domeGeometry.center();
const blueMaterial = new MeshStandardMaterial({ color: "#4A90E2" });
mesh = new Mesh(domeGeometry, blueMaterial);
applyImportSettings(mesh, configs.dome);
export let domeMesh = mesh;

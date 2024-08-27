import { Mesh, MeshStandardMaterial, Vector3 } from "three";

import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

// enum PieceModel {
//   BUILDER,
//   BASE,
//   MID,
//   TOP,
//   DOME,
//   BOARD,
// }

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

export const stlLoader = new STLLoader();

function applyImportSettings(mesh: Mesh, config: STLImportConfig) {
  mesh.rotateX(config.x_rotation);
  mesh.position.y += config.y_offset;
  mesh.scale.set(config.scale, config.scale, config.scale);
}

const material = new MeshStandardMaterial({
  color: "white",
  transparent: true,
});
const blueMaterial = new MeshStandardMaterial({
  color: "#4A90E2",
  transparent: true,
});
let mesh;

const [
  boardGeometry,
  builderGeometry,
  baseGeometry,
  midGeometry,
  topGeometry,
  domeGeometry,
] = await Promise.all([
  stlLoader.loadAsync(configs.board.file),
  stlLoader.loadAsync(configs.builder.file),
  stlLoader.loadAsync(configs.base.file),
  stlLoader.loadAsync(configs.mid.file),
  stlLoader.loadAsync(configs.top.file),
  stlLoader.loadAsync(configs.dome.file),
]);

boardGeometry.center();
mesh = new Mesh(boardGeometry, material);
applyImportSettings(mesh, configs.board);
mesh.position.add(new Vector3(2, 0, 2));
export const boardMesh = mesh;
export const getBoardMesh = () => boardMesh.clone();

builderGeometry.center();
mesh = new Mesh(builderGeometry, material);
applyImportSettings(mesh, configs.builder);
export const builderMesh = mesh;
export const getBuilderMesh = () => builderMesh.clone();

baseGeometry.center();
mesh = new Mesh(baseGeometry, material);
applyImportSettings(mesh, configs.base);
export const baseMesh = mesh;
export const getBaseMesh = () => baseMesh.clone();

midGeometry.center();
mesh = new Mesh(midGeometry, material);
applyImportSettings(mesh, configs.mid);
export const midMesh = mesh;
export const getMidMesh = () => midMesh.clone();

topGeometry.center();
mesh = new Mesh(topGeometry, material);
applyImportSettings(mesh, configs.top);
export const topMesh = mesh;
export const getTopMesh = () => topMesh.clone();

domeGeometry.center();
mesh = new Mesh(domeGeometry, blueMaterial);
applyImportSettings(mesh, configs.dome);
export const domeMesh = mesh;
export const getDomeMesh = () => domeMesh.clone();

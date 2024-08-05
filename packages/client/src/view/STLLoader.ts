import { Mesh, MeshStandardMaterial, Vector3 } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

export class STLImportConfig {
  constructor(
    public file: string,
    public y_offset: number,
    public x_rotation: number,
    public scale: number,
  ) { }
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

const stlLoader = new STLLoader();
const material = new MeshStandardMaterial({ color: "white", transparent: true });
const blueMaterial = new MeshStandardMaterial({ color: "#4A90E2", transparent: true });

const geometries = {};

async function loadSTLFiles() {
  const promises = Object.keys(configs).map(async (key) => {
    const geometry = await stlLoader.loadAsync(configs[key].file);
    geometry.center();
    geometries[key] = geometry;
  });
  await Promise.all(promises);
}

function applyImportSettings(mesh, config) {
  mesh.rotateX(config.x_rotation);
  mesh.position.y += config.y_offset;
  mesh.scale.set(config.scale, config.scale, config.scale);
}

function createMesh(name, material) {
  const geometry = geometries[name];
  const mesh = new Mesh(geometry, material);
  applyImportSettings(mesh, configs[name]);
  return mesh;
}

let isInitialized = false;

export const initializeMeshes = async () => {
  if (!isInitialized) {
    await loadSTLFiles();
    isInitialized = true;
  }
};

export const getBoardMesh = () => createMesh("board", material).clone();
export const getBuilderMesh = () => createMesh("builder", material).clone();
export const getBaseMesh = () => createMesh("base", material).clone();
export const getMidMesh = () => createMesh("mid", material).clone();
export const getTopMesh = () => createMesh("top", material).clone();
export const getDomeMesh = () => createMesh("dome", blueMaterial).clone();

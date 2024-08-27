import { STLImportConfig, configs, getBaseMesh, getMidMesh, getTopMesh, getDomeMesh } from "../STLLoader";
import { BlockType } from "../../model/BlockType";
import { Mesh, MeshBasicMaterial } from "three";
import Piece from "./Piece";

export default class Block extends Piece {
  type: BlockType;

  constructor(type: BlockType) {
    let config: STLImportConfig;
    let mesh: Mesh;

    switch (type) {
      case "BASE":
        config = configs.base;
        mesh = getBaseMesh();
        break;
      case "MID":
        config = configs.mid;
        mesh = getMidMesh();
        break;
      case "TOP":
        config = configs.top;
        mesh = getTopMesh();
        break;
      case "DOME":
        config = configs.dome;
        mesh = getDomeMesh();
        break;
      default:
        throw new Error("Invalid piece type");
    }

    if (!config) {
      throw new Error("Config is undefined");
    }

    super(2 * config.y_offset, new Mesh());

    this.type = type;
    if (mesh) {
      this.loadMesh(mesh);
    }
  }

  private async loadMesh(mesh: Mesh) {
    const material = (mesh.material as MeshBasicMaterial).clone();
    mesh.material = material;
    this.remove(this.mesh);
    this.mesh = mesh;
    this.add(this.mesh);
  }

  getType() {
    return this.type;
  }
}

import { BufferGeometry, Mesh, MeshStandardMaterial } from "three";
import { STLImportConfig, configs, stlloader } from "./STLLoader";

import { BlockType } from "./BlockType";
import Piece from "./Piece";

export default class Block extends Piece {
  type: BlockType;

  constructor(type: BlockType) {
    let tmpConfig: STLImportConfig | undefined;
    let color: number = 0xcccccc;
    switch (type) {
      case "BASE":
        tmpConfig = configs.base;
        break;
      case "MID":
        tmpConfig = configs.mid;
        break;
      case "TOP":
        tmpConfig = configs.top;
        break;
      case "DOME":
        tmpConfig = configs.dome;
        break;
      default:
        console.error("Invalid piece type");
    }
    if (tmpConfig == undefined) {
      throw new Error("Config is undefined");
    }
    const config = tmpConfig; // TODO refactor just avoiding compiler error

    let mesh;
    stlloader.load(config.file, (geometry: BufferGeometry) => {
      const material = new MeshStandardMaterial({
        color: color,
        transparent: true,
      });
      geometry.center();
      mesh = new Mesh(geometry, material);
      mesh.position.setY(config.y_offset);
      mesh.scale.set(config.scale, config.scale, config.scale);
      mesh.rotateX(config.x_rotation);
    });
    if (mesh == undefined) {
      throw new Error("Mesh is undefined");
    }

    super(2 * config.y_offset, mesh);
    this.type = type;
  }

  getType() {
    return this.type;
  }
}

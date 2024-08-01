import {
  STLImportConfig,
  baseMesh,
  configs,
  domeMesh,
  midMesh,
  topMesh,
} from "../STLLoader";

import { BlockType } from "../../model/BlockType";
import { Mesh } from "three";
import Piece from "./Piece";

export default class Block extends Piece {
  type: BlockType;

  constructor(type: BlockType) {
    let config: STLImportConfig;
    let mesh: Mesh;
    switch (type) {
      case "BASE":
        config = configs.base;
        mesh = baseMesh;
        break;
      case "MID":
        config = configs.mid;
        mesh = midMesh;
        break;
      case "TOP":
        config = configs.top;
        mesh = topMesh;
        break;
      case "DOME":
        config = configs.dome;
        mesh = domeMesh;
        break;
      default:
        throw new Error("Invalid piece type");
    }
    if (config == undefined || mesh == undefined) {
      throw new Error("Config or mesh is undefined");
    }

    super(2 * config.y_offset, mesh);
    this.type = type;
  }

  getType() {
    return this.type;
  }
}

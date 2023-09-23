import { STLImportConfig, locations } from "./STLLoader";

import Block from "./Block";
import { BlockType } from "./BlockType";
import Builder from "./Builder";
import Piece from "./Piece";

export default class PieceFactory {
  static createBuilder(): Piece {
    return new Builder();
  }

  static createBlock(height: number): Piece | undefined {
    let type: BlockType;
    switch (height) {
      case 1:
        type = "BASE";
        break;

      default:
        return;
    }

    return new Block(type);
  }

  createPiece() {
    let config: STLImportConfig = new STLImportConfig(0, 0, 0.03);
    let color: number = 0xcccccc;
    let location: string = "";

    let type = "BASE";
    switch (type) {
      case "BUILDER":
        location = locations.builder;
        config = new STLImportConfig(0.47, -Math.PI / 2, 0.03);
        break;

      case "BASE":
        location = locations.base;
        config = new STLImportConfig(0.231, -Math.PI / 2, 0.028);
        break;

      case "MID":
        location = locations.mid;
        config = new STLImportConfig(0.275, -Math.PI / 2, 0.028);
        break;

      case "TOP":
        location = locations.top;
        config = new STLImportConfig(0.165, Math.PI / 2, 0.028);
        break;

      case "DOME":
        location = locations.dome;
        config = new STLImportConfig(0.1, -Math.PI / 2, 0.0165);
        break;

      default:
        console.error("Invalid piece type");
    }
  }
}

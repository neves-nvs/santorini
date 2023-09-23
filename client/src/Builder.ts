import { builderMesh, configs } from "./STLLoader";

import Piece from "./Piece";

let counter: number = 0; // todo removeo

export default class Builder extends Piece {
  constructor() {
    let color: number = 0xcccccc;

    let config = configs.builder;
    color = counter % 2 == 0 ? 0x3260a8 : 0xf56642;
    counter++;

    super(2 * config.y_offset, builderMesh.clone());
  }
}

import { builderMesh, configs } from "../STLLoader";

import Piece from "./Piece";

export default class Builder extends Piece {
  constructor() {
    const config = configs.builder;
    const mesh = builderMesh;

    super(2 * config.y_offset, mesh);
  }
}

import { BufferGeometry, Mesh, MeshStandardMaterial } from "three";
import { configs, stlloader } from "./STLLoader";

import Piece from "./Piece";

let counter: number = 0; // todo removeo

export default class Builder extends Piece {
  constructor() {
    let color: number = 0xcccccc;

    let config = configs.builder;
    color = counter % 2 == 0 ? 0x3260a8 : 0xf56642;
    counter++;

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
  }
}

import {
  BoxGeometry,
  Material,
  Mesh,
  MeshBasicMaterial,
  Object3D,
} from "three";

import { SpaceShade } from "../BoardManager"; // TODO should not be here

export default class Space extends Object3D {
  mesh: Mesh;

  height: number = 0;

  constructor(shade: SpaceShade) {
    super();

    this.mesh = this.addButtonMesh();
    this.add(this.mesh);

    this.type = "SPACE";
  }

  private addButtonMesh(): Mesh {
    this.type = "SPACE";
    const material = new MeshBasicMaterial({
      color: "blue",
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    let geometry = new BoxGeometry(0.8, 0.3, 0.8);
    return new Mesh(geometry, material);
  }

  update(delta: number) {}

  hover() {
    (this.mesh.material as Material).opacity = 0.8;
  }

  reset() {
    (this.mesh.material as Material).opacity = 0.2;
  }
}

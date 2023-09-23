import { Mesh, Object3D } from "three";

let counter: number = 0; // todo remove

export default abstract class Piece extends Object3D {
  private height: number;
  private mesh: Mesh;

  constructor(height: number, mesh: Mesh) {
    super();

    this.height = height;

    this.mesh = mesh;
    this.add(mesh);
  }

  getMesh() {
    return this.mesh;
  }

  getHeight() {
    return this.height;
  }

  update() {}
}

import { Mesh, MeshBasicMaterial, Object3D } from "three";

export default abstract class Piece extends Object3D {
  private height: number;
  private mesh: Mesh;

  constructor(height: number, mesh: Mesh) {
    super();
    this.height = height;

    this.mesh = mesh.clone();
    const material = (mesh.material as MeshBasicMaterial).clone();
    this.mesh.material = material;

    this.add(this.mesh);
  }

  getMesh() {
    return this.mesh;
  }

  getHeight() {
    return this.height;
  }

  public hover() {
    const opacity = 0.5;
    const material = this.mesh.material as MeshBasicMaterial;
    material.opacity = opacity;
  }

  public unhover() {
    const material = this.mesh.material as MeshBasicMaterial;
    material.opacity = 1.0;
  }

  update() {}
}

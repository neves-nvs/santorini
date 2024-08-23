import { Mesh, MeshBasicMaterial, Object3D } from "three";

export default abstract class Piece extends Object3D {
  private height: number;
  protected mesh: Mesh;

  constructor(height: number, mesh: Mesh) {
    super();
    this.height = height;
    this.mesh = mesh;
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

  public unHover() {
    const material = this.mesh.material as MeshBasicMaterial;
    material.opacity = 1.0;
  }

  update() {}
}

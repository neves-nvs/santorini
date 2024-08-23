import { configs, getBuilderMesh } from "../STLLoader";
import Piece from "./Piece";
import { Mesh, MeshBasicMaterial } from "three";

export default class Builder extends Piece {
  constructor() {
    const config = configs.builder;
    const placeholderMesh = new Mesh(); // Temporary placeholder mesh
    super(2 * config.y_offset, placeholderMesh);
    this.loadMesh();
  }

  private async loadMesh() {
    const mesh = await getBuilderMesh();
    this.setMesh(mesh);
  }

  private setMesh(mesh: Mesh) {
    this.remove(this.mesh);
    const material = (mesh.material as MeshBasicMaterial).clone();
    mesh.material = material;
    this.mesh = mesh;
    this.add(this.mesh);
  }
}

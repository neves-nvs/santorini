import { BufferGeometry, Mesh, MeshStandardMaterial, Object3D } from "three";

import { Space3D, SpaceType } from "./space3D";

import { Piece3D, PieceType } from "./piece3D";

import { locations, stlloader } from "./stlloader";
import { Position } from "../model/model";

export class Board3D extends Object3D {
  spaces: Space3D[][];
  builders: Piece3D[] = [];

  mesh: Mesh | undefined;

  constructor() {
    super();
    this.drawCoordinates();

    this.spaces = new Array(5);
    let space;
    for (let x = 0; x < 5; x++) {
      this.spaces[x] = new Array(5);
      for (let z = 0; z < 5; z++) {
        let shade: SpaceType;
        if (z % 2 == 0) {
          shade = x % 2 == 0 ? SpaceType.Light : SpaceType.Dark;
        } else {
          shade = x % 2 == 0 ? SpaceType.Dark : SpaceType.Light;
        }
        space = new Space3D(shade);
        space.position.set(x, 0, z);
        this.spaces[x][z] = space;
        this.add(space);
      }
    }

    this.addMesh();
  }

  addMesh() {
    const location = locations["board"];

    let geometry: BufferGeometry = new BufferGeometry();
    stlloader.load(location, g => {
      geometry = g;
      const material = new MeshStandardMaterial({ color: "white" });
      geometry.center();
      this.mesh = new Mesh(geometry, material);

      let scale = 0.031747;
      this.mesh.scale.set(scale, scale, scale);
      this.add(this.mesh);

      this.mesh.rotateX(-Math.PI / 2);

      this.mesh.position.set(2, -0.067, 2);
    });
  }

  getSpace(position: Position): Space3D {
    let [x, y] = position.destructure();
    return this.spaces[x][y];
  }

  placeBuilder(position: Position) {
    const piece: Piece3D = this.getSpace(position).addPiece(PieceType.Builder);
    this.builders.push(piece);
  }

  build(position: Position) {
    const space: Space3D = this.getSpace(position);
    if (!space.available()) {
      console.log("Building on occupied space");
      return;
    }
    space.build();
  }

  getBuilders(): Piece3D[] {
    return this.builders;
  }

  update(delta: number) {
    this.spaces.flat().forEach(s => s.update(delta));
  }

  private drawCoordinates() {

  }
}
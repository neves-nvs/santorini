import { BufferGeometry, Mesh, MeshStandardMaterial, Object3D } from "three";

import { Space3D, SpaceShade } from "./space3D";
import { Piece3D } from "./piece3D";
import { locations, stlloader } from "./stlloader";

import Position from "../common/position";

export class Board3D extends Object3D {
  spaces: Space3D[][];
  builders: Piece3D[] = [];

  constructor() {
    super();

    this.spaces = new Array(5);
    let space;
    for (let x = 0; x < 5; x++) {
      this.spaces[x] = new Array(5);
      for (let z = 0; z < 5; z++) {
        let shade: SpaceShade;
        if (z % 2 == 0) {
          shade = x % 2 == 0 ? SpaceShade.Light : SpaceShade.Dark;
        } else {
          shade = x % 2 == 0 ? SpaceShade.Dark : SpaceShade.Light;
        }
        space = new Space3D(shade);
        space.position.set(x, 0, z);
        this.spaces[x][z] = space;
        this.add(space);
      }
    }

    this.drawCoordinates();
    this.addMesh();
  }

  private addMesh() {
    const location = locations["board"];

    let geometry: BufferGeometry = new BufferGeometry();
    stlloader.load(location, g => {
      geometry = g;

      const material = new MeshStandardMaterial({ color: "white" });
      geometry.center();

      const mesh = new Mesh(geometry, material);

      const scale = 0.031747;
      mesh.scale.set(scale, scale, scale);
      mesh.rotateX(-Math.PI / 2);
      mesh.position.set(2, -0.067, 2);

      this.add(mesh);
    });
  }

  getSpace(position: Position): Space3D {
    let [x, y] = position.destructure();
    return this.spaces[x][y];
  }

  update(delta: number) {
    this.spaces.flat().forEach(s => s.update(delta));
  }

  placeBuilder(position: Position) {
    const piece: Piece3D = this.getSpace(position).addPiece('BUILDER');
    this.builders.push(piece);
  }

  build(position: Position) {
    const space = this.getSpace(position);
    space.build();
  }

  place() {
    console.log("PLACE")
  }

  move(source: Position, destiny: Position) {
    const sourceSpace = this.getSpace(source);
    const builder = sourceSpace.getBuilder();

    const destSpace = this.getSpace(destiny);
    if (builder == undefined) return; //TODO handle better
    destSpace.place(builder);
  }

  private drawCoordinates() {

  }

}
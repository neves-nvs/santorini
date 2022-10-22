import {
  BufferGeometry,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from "three";

import { Space, SpaceType } from "./space";

import { Piece, PieceType } from "./piece";

import {
  locations,
  stlloader
} from "../assets_loader/stlloader";


export class Board extends Object3D {
  spaces;
  builders: Piece[];

  mesh: Mesh | undefined;

  constructor() {
    super();
    this.drawCoordinates();

    this.builders = [];

    this.spaces = new Array(5);
    let space;
    for (let x = 0; x < 5; x++) {
      this.spaces[x] = new Array(5);

      for (let z = 0; z < 5; z++) {
        if (z % 2 == 0) space = new Space(x % 2 == 0 ? SpaceType.Light : SpaceType.Dark, x, z);
        else space = new Space(x % 2 == 0 ? SpaceType.Dark : SpaceType.Light, x, z);

        space.position.set(x, 0, z);
        this.spaces[x][z] = space;
        this.add(space);
      }
    }
    console.log(
        " ___________________ \n" +
        "|   |   |   |   |   |\n" +
        "|0_0|___|___|___|4_0|\n" +
        "|   |   |   |   |   |\n" +
        "|___|___|___|___|___|\n" +
        "|   |   |   |   |   |\n" +
        "|___|___|2_2|___|___|\n" +
        "|   |   |   |   |   |\n" +
        "|___|___|___|___|___|\n" +
        "|   |   |   |   |   |\n" +
        "|0_4|___|___|___|4_4|\n"
    );

    this.addMesh();
  }

  addMesh(){
    const location = locations["board"];

    let geometry: BufferGeometry = new BufferGeometry();
    stlloader.load(location, g => geometry = g);

    geometry.center();
    let material = new MeshStandardMaterial({color: "white"});
    this.mesh = new Mesh(geometry, material);

    let scale = 0.031747;
    this.mesh.scale.set(scale, scale, scale);
    this.add(this.mesh);

    this.mesh.rotateX(- Math.PI / 2);

    this.mesh.position.set(2, -0.067, 2);
  }

  play(move: Move) { // TODO remove (move to game)
    switch (move.type) {
      case MoveType.Move:
        //this.move(move.position);
        break;
      case MoveType.Build:
        this.build(move.x, move.y);
        break;
      case MoveType.Place_Builder:
        this.placeBuilder(move.x, move.y);
        break;
    }
  }

  getSpace(x: number, y: number) {
    return this.spaces[x][y];
  }

  /**
   * PIECE MOVEMENT
   */
  getAdjacentSpaces(x: number, y: number): Space[] {
    let adjacentSpaces: Array<Space> = new Array<Space>();

    // top left boundary
    if (x > 0 && y > 0) adjacentSpaces.push(this.getSpace(x-1, y-1));
    // left boundary
    if (x > 0) adjacentSpaces.push(this.getSpace(x-1, y));
    // left bottom boundary
    if (x > 0 && y < 4) adjacentSpaces.push(this.getSpace(x-1, y+1)) ;

    // bottom boundary
    if (y < 4) adjacentSpaces.push(this.getSpace(x, y+1));
    // bottom right boundary
    if(x < 4 && y < 4) adjacentSpaces.push(this.getSpace(x+1, y+1));

    // right boundary
    if (x < 4) adjacentSpaces.push(this.getSpace(x+1, y));
    // right top boundary
    if (x < 4 && y > 0) adjacentSpaces.push(this.getSpace(x+1, y-1));

    // top boundary
    if (y > 0) adjacentSpaces.push(this.getSpace(x, y-1));

    return adjacentSpaces;
  }

  placeBuilder(x: number, y: number) {
    const piece: Piece = this.getSpace(x, y).addPiece(PieceType.Builder);
    this.builders.push(piece);
  }

  build(x: number, y: number) {
    const space: Space = this.getSpace(x, y);
    if (!space.available()) {
      console.log("Building on occupied space");
      return;
    }

    space.build();
  }

  getBuilders(): Piece[] { return this.builders; }


  update(){
  }


  private drawCoordinates(){}
}

export class Move {
  type: number;
  x: number;
  y: number;

  constructor(type: number, x: number, y: number) {
    this.type = type;
    this.x = x;
    this.y = y;
  }
}

export const MoveType = {
  Move: 0,
  Build: 1,
  Place_Builder: 2,
};

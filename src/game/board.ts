import {Group, Mesh, Vector2} from "three";

import { Piece, PieceType } from "./piece";

import { SpaceType, Space } from "./space";

import { Selectable, SelectableType } from "./selectable";


export class Board extends Group {
  spaces;
  builders: Piece[];

  adjacents: Space[] | undefined;
  hoveredPiece: Selectable | undefined;
  selectedPiece: Selectable | undefined;

  constructor() {
    super();
    this.drawCoordinates();

    this.builders = [];

    this.spaces = new Array(5);
    let space;
    for (let x = 0; x < 5; x++) {
      this.spaces[x] = new Array(5);

      for (let z = 0; z < 5; z++) {
        let position = new Vector2(x, z); // intended workaround vector2 property names
        if (z % 2 == 0) space = new Space(x % 2 == 0 ? SpaceType.Light : SpaceType.Dark, position);
        else space = new Space(x % 2 == 0 ? SpaceType.Dark : SpaceType.Light, position);

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
  }

  play(move: Move) {
    switch (move.type) {
      case MoveType.Move:
        //this.move(move.position);
        break;
      case MoveType.Build:
        //this.build(move.position);
        break;
      case MoveType.Place_Builder:
        this.placeBuilder(move.position);
        break;
    }
  }

  placeBuilder(position: Vector2) {
    //const piece = new Piece(PieceType.Builder);
    const piece: Piece = this.getSpace(position).addPiece(PieceType.Builder);
    this.builders.push(piece);
  }

  private getSpace(position: Vector2) {
    return this.spaces[position.x][position.y];
  }

  getSelectablePieces(): Mesh[] {
    let selectablePieces: Mesh[] = this.getBuilders().map(b => b.mesh);
    const builder: Selectable | undefined = this.selectedPiece;
    if ( builder != undefined) {
      const adjacentPieces = this.getAdjacentSpaces( builder.grid_position );
      selectablePieces = selectablePieces.concat( adjacentPieces.filter(s => s.available()).map(s => s.mesh) );
    }

    return selectablePieces;
  }

  /**
   * PIECE MOVEMENT
   */
  getAdjacentSpaces(position: Vector2): Space[] {
    // TODO translate space
    let adjacentSpaces: Array<Space> = new Array<Space>();

    // TODO FIX THIS USE ARRAY<ARRAY<SPACE>>
    // top left boundary
    if (position.x > 0 && position.y > 0) adjacentSpaces.push(this.getSpace(new Vector2(position.x-1, position.y-1)));
    // left boundary
    if (position.x > 0) adjacentSpaces.push(this.getSpace(new Vector2(position.x-1, position.y)));
    // left bottom boundary
    if (position.x > 0 && position.y < 4) adjacentSpaces.push(this.getSpace(new Vector2(position.x-1, position.y+1))) ;

    // bottom boundary
    if (position.y < 4) adjacentSpaces.push(this.getSpace(new Vector2(position.x, position.y+1)));
    // bottom right boundary
    if(position.x < 4 && position.y < 4) adjacentSpaces.push(this.getSpace(new Vector2(position.x+1, position.y+1)));

    // right boundary
    if (position.x < 4) adjacentSpaces.push(this.getSpace(new Vector2(position.x+1, position.y)));
    // right top boundary
    if (position.x < 4 && position.y > 0) adjacentSpaces.push(this.getSpace(new Vector2(position.x+1, position.y-1)));

    // top boundary
    if (position.y > 0) adjacentSpaces.push(this.getSpace(new Vector2(position.x, position.y-1)));

    return adjacentSpaces;
  }


  //move(position: Vector2) {}

  //build(position: Vector2) {}

  start_game() {}

  reset_game() {}

  game_over() {}

  get_possible_moves() {}

  hover(hovered: Selectable | undefined) {this.hoveredPiece = hovered;}

  getBuilders(): Piece[] { return this.builders; }

  resetPiece(){ this.hoveredPiece?.deDim(); }

  /**
   *
   */
  update(){
    // dim hovered and selected pieces
    this.hoveredPiece?.dim();
    this.selectedPiece?.dim();
    //
  }

  /**
   * MOUSE CLICK EVENT ---------------------------------------------------------
   */
  onClick(){
    if (this.selectedPiece && this.hoveredPiece){
      // remove previously adjacent spaces
      this.adjacents?.forEach( s => s.hideButton() );
    }
    if (this.hoveredPiece) { // only deselect previous selected piece if click is on selectable piece
      // unselect previously selected piece
      this.selectedPiece?.deDim();
      this.selectedPiece = this.hoveredPiece;

      // show possible squares if there is selected piece
      this.adjacents = this.getAdjacentSpaces(this.selectedPiece.grid_position);

      for (let space of this.adjacents){
        if (space.available()) space.showButton()
      }
    }

    // TODO Call onClick()/update_buttons for each space



    // dim piece to show selection
    this.selectedPiece?.dim();
  }

  /**
   * Draw Coordinates
   */
  private drawCoordinates(){

  }
}

export class Move {
  type: number;
  position: Vector2;

  constructor(type: number, position: Vector2) {
    this.type = type;
    this.position = position;
  }
}

export const MoveType = {
  Move: 0,
  Build: 1,
  Place_Builder: 2,
};

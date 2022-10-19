import {
  Scene,
  DirectionalLight,
  AmbientLight,
  AxesHelper,
  GridHelper,
  Mesh
} from "three";

import { Board, Move, MoveType } from "./game/board";
import {Selectable} from "./game/selectable";

export default class GameScene extends Scene {
  board: Board;
  axesHelper: AxesHelper;
  gridHelper: GridHelper;
  ambientLight: AmbientLight;
  directionalLight: DirectionalLight;

  constructor() {
    super();

    this.board = new Board();
    this.axesHelper = new AxesHelper(5);
    this.gridHelper = new GridHelper(11, 11);
    this.ambientLight = new AmbientLight(0x404040);
    this.directionalLight = new DirectionalLight(0xffffff, 0.5);

    this.add(this.board);
    this.add(this.axesHelper);
    this.add(this.gridHelper);
    this.add(this.ambientLight);
    this.add(this.directionalLight);

    this.board.play(new Move(MoveType.Place_Builder, 0, 0));
    this.board.play(new Move(MoveType.Place_Builder, 1, 1));
    this.board.play(new Move(MoveType.Place_Builder, 3, 3));

    this.board.play(new Move(MoveType.Build, 3, 3));
    this.board.play(new Move(MoveType.Build, 1, 0));
    this.board.play(new Move(MoveType.Build, 1, 0));
    this.board.play(new Move(MoveType.Build, 1, 0));
    this.board.play(new Move(MoveType.Build, 1, 0));
    this.board.play(new Move(MoveType.Build, 2, 0));

    this.board.play(new Move(MoveType.Build, 0, 1));
  }

  getSelectablePieces(): Mesh[] {
    // rename to getAdjacent
    // add gameplay logic here
    return this.board.getSelectablePieces();
  }

  hover(hovered: Selectable | undefined) {
    this.board.hover(hovered);
  }

  resetPiece(){
    this.board.resetPiece();
  }

  update(){
    this.board.update();
  }

  onClick(){
    // save previously selected piece
    // get now clicked piece
    this.board.onClick();
    // call move or build depending on whether state is building or moving
    /*
    if (clickObject == undefined) return // to be decided
    if (state == gamestart)
    else if (state == build)
      build(x, y)
    else if (state == move)
      move(piece, x, y)
     */

  }
}


// STATE MACHINE
class GameState {

  handle()
}

class PlayerPhase {
  handle(){

  }
}
class MovePhase extends PlayerPhase {
  handle(){

  }
}

class BuildPhase extends PlayerPhase {
  handle(){

  }
}


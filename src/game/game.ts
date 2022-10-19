import {AmbientLight, AxesHelper, DirectionalLight, GridHelper, Scene} from "three";

import {Board, Move, MoveType} from "./game/board";
import {Selectable, SelectableType} from "./game/selectable";

export default class GameScene extends Scene {
  board: Board;
  axesHelper: AxesHelper;
  gridHelper: GridHelper;
  ambientLight: AmbientLight;
  directionalLight: DirectionalLight;

  hoveredPiece: Selectable | undefined;
  selectedPiece: Selectable | undefined;

  movingBuilder: Selectable | undefined;
  // move
  validSpaces: Selectable[] = [];
  // build

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



  getSelectablePieces(): Selectable[] {
    if (gameState == "place"){
      return this.validSpaces;

    } else if (gameState == "move"){
      const builders: Selectable[] = this.board.getBuilders();
      return builders.concat(this.validSpaces);

    } else if (gameState == "build"){
      return this.validSpaces
    }
    return this.board.builders; // not reachable under normal circunstances
  }

  hover(hovered: Selectable | undefined) {
    this.hoveredPiece = hovered;
  }

  resetPiece(){
    this.hoveredPiece?.normal();
  }

  update(){
    this.hoveredPiece?.highlight();
    this.board.update();
  }

  onClick(){

    // get now clicked piece
    this.selectedPiece = this.hoveredPiece;

    if (gameState == "place") {
      gameState = "move";
      // get all pieces, flatten, filter per available

    } else if (gameState == "move"){
      // TODO
      if (this.selectedPiece?.sel_type == SelectableType.Builder) {
        this.movingBuilder?.normal();
        this.movingBuilder = this.selectedPiece;

        this.selectedPiece.highlight();

        this.validSpaces.forEach(s => s.reset());

        let [x, y] = [this.selectedPiece.x, this.selectedPiece.y];
        this.validSpaces = this.board
            .getAdjacentSpaces(x, y)
            .filter(s => s.available());

        this.validSpaces.forEach(s => s.normal());


      } else if (this.selectedPiece?.sel_type == SelectableType.Space){
        let [x_src, y_src] = [this.movingBuilder.x, this.movingBuilder.y];
        let [x_dest, y_dest] = [this.selectedPiece.x, this.selectedPiece.y];
        this.board.getSpace( x_dest, y_dest)
            .movePiece(this.board.getSpace(x_src, y_src));

        this.validSpaces.forEach(s => s.reset());
        this.validSpaces = this.board
            .getAdjacentSpaces(x_dest, y_dest)
            .filter(s => s.available());

        this.validSpaces.forEach(s => s.normal());

        this.movingBuilder?.normal();

        this.movingBuilder = undefined;

        this.hoveredPiece = undefined; // stop piece moved into from being set to normal opacity by loop

        // change game state
        gameState = "build";
      }

    } else if (gameState == "build"){

      if (this.selectedPiece?.sel_type == SelectableType.Space){

        let [x, y] = [this.selectedPiece.x,  this.selectedPiece.y];
        this.board.build(x, y);

        this.validSpaces.forEach(s => s.reset());
        this.validSpaces = [];

        this.selectedPiece.reset();
        this.selectedPiece = undefined;
        this.movingBuilder = undefined;

        this.hoveredPiece = undefined; // stop piece moved into from being set to normal opacity by loop

        // change game state
        gameState = "move";
      }
    }
  }
}

let gameState = "place"; // TODO remove

// STATE MACHINE
class GameState {

  handle()
}

class PlayerPhase {

  play: Function;

  constructor(nextPlayer: PlayerPhase) {
    this.play = this.move;
  }

  move(){
    this.play();
    this.play = this.build;
  }

  build(){
    this.play();
    this.play = this.end;
  }

  end(){

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


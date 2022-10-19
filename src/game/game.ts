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

  // move
  selectedBuilder: Selectable | undefined;
  movableSpaces: Selectable[] = [];
  // build
  movedBuilder: Selectable | undefined;

  selectablePieces: Selectable[] = [];

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

    this.selectablePieces = this.board.getBuilders();
  }



  getSelectablePieces(): Selectable[] {
    // TODO only return this.selectablePieces;
    return this.selectablePieces;
    if (gameState == "place"){

    } else if (gameState == "move"){
      const builders: Selectable[] = this.board.getBuilders();
      return builders.concat(this.movableSpaces);

    } else if (gameState == "build"){

    }
    return this.selectablePieces;
  }

  hover(hovered: Selectable | undefined) {
    this.hoveredPiece = hovered;
    //this.board.hover(hovered);
  }

  resetPiece(){
    // spaces
    // builders
    //this.selectedBuilder?.normal();
    // both
    this.hoveredPiece?.normal();
    this.selectedBuilder?.normal();
    //this.selectedPiece?.normal();
  }

  update(){
    //this.selectablePieces.forEach(p => p.normal());
    this.hoveredPiece?.highlight();
    this.selectedBuilder?.highlight();
    //this.board.update();
    console.log(gameState);
  }

  onClick(){
    // get now clicked piece

    this.selectedPiece = this.hoveredPiece;


    if (gameState == "place") {
      this.selectablePieces = this.board.getBuilders();
      gameState = "move";

    } else if (gameState == "move"){
      // TODO
      this.selectablePieces = this.board.getBuilders();
      if (this.selectedPiece?.sel_type == SelectableType.Builder) {
        // save selected builder for space choice
        this.selectedBuilder = this.selectedPiece;

        // clear previous
        this.movableSpaces.forEach(s => s.reset());

        // highlight it
        this.selectedPiece.highlight();

        // get coordinates
        let [x, y] = [this.selectedPiece.x, this.selectedPiece.y];
        this.selectablePieces = this.selectablePieces
            .concat(this.board.getAdjacentSpaces(this.selectedBuilder.x, this.selectedBuilder.y));


        this.movableSpaces = this.board
            .getAdjacentSpaces(x, y)
            .filter(s => s.available());
        this.movableSpaces.forEach(s => s.normal());

      } else if (this.selectedPiece?.sel_type == SelectableType.Space){
        this.selectedPiece.reset();
        // erase adjacent spaces from before builder was moved
        this.movableSpaces.forEach(s => s.reset());
        this.movableSpaces = [];

        // move builder and save it for build phase
        this.movedBuilder = this.selectedBuilder;
        this.board.getSpace(this.selectedPiece.x, this.selectedPiece.y)
            .movePiece(this.board.getSpace(this.movedBuilder.x, this.movedBuilder.y));

        // @ts-ignore TODO FIX
        this.selectablePieces = this.board
            .getAdjacentSpaces(this.movedBuilder.x, this.movedBuilder.y)
            .filter(s => s.available());
        this.selectablePieces.forEach(s => s.normal());
        this.movedBuilder = undefined;

        // change game state
        gameState = "build";
      }

    } else if (gameState == "build"){
      console.log(this.selectedPiece?.sel_type);
      if (this.selectedPiece?.sel_type == SelectableType.Space){
        // clear
        this.selectedBuilder = undefined;
        this.movedBuilder?.normal();
        this.movedBuilder = undefined;

        //
        let [x, y] = [this.selectedPiece.x,  this.selectedPiece.y];
        this.board.build(x, y);

        // change game state
        gameState = "move";
        this.selectablePieces = this.board.getBuilders();
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


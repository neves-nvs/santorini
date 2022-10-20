import {AmbientLight, AxesHelper, DirectionalLight, GridHelper, Scene} from "three";

import {Board} from "./game/board";
import {Selectable, SelectableType} from "./game/selectable";

let gameState = "place";
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

    this.validSpaces = this.board.spaces.flat().filter(s => s.available());
    this.validSpaces.forEach(s => s.normal());
  }

  getSelectablePieces(): Selectable[] {
    if (gameState == "place"){
      return this.validSpaces;

    } else if (gameState == "move"){
      const builders: Selectable[] = this.board.getBuilders();
      return builders.concat(this.validSpaces);

    } else if (gameState == "build"){
      return this.validSpaces;
    }
    return []; // not reachable under normal circunstances
  }

  hover(hovered: Selectable | undefined) {
    this.hoveredPiece = hovered;
  }

  resetPiece(){
    this.hoveredPiece?.normal();
  }

  update(){
    //this.validSpaces.forEach(s => s.normal());
    this.hoveredPiece?.highlight();
    this.board.update();
  }

  onClick(){
    this.validSpaces.forEach(s => s.reset());
    // get now clicked piece
    this.selectedPiece = this.hoveredPiece;


    if (gameState == "place") {

      if(this.selectedPiece?.sel_type == SelectableType.Space){
        let [x, y] = [this.selectedPiece.x,  this.selectedPiece.y];
        this.board.placeBuilder(x, y);
        this.validSpaces = this.board.spaces.flat().filter(s => s.available());
      }

      if(this.board.builders.length == 4) {
        this.validSpaces.forEach(s => s.reset());
        this.validSpaces = [];

        gameState = "move";
      }

    } else if (gameState == "move"){

      if (this.selectedPiece?.sel_type == SelectableType.Builder) {
        this.movingBuilder?.normal();
        this.movingBuilder = this.selectedPiece;

        this.selectedPiece.highlight();

        let [x, y] = [this.selectedPiece.x, this.selectedPiece.y];
        this.validSpaces = this.board
            .getAdjacentSpaces(x, y)
            .filter(s => s.available());

      } else if (this.selectedPiece?.sel_type == SelectableType.Space){

        let [x_src, y_src] = [this.movingBuilder.x, this.movingBuilder.y];
        let [x_dest, y_dest] = [this.selectedPiece.x, this.selectedPiece.y];
        this.board.getSpace( x_dest, y_dest)
            .movePiece(this.board.getSpace(x_src, y_src));

        this.validSpaces = this.board
            .getAdjacentSpaces(x_dest, y_dest)
            .filter(s => s.available());

        this.movingBuilder = undefined;

        gameState = "build";
      }

    } else if (gameState == "build"){

      if (this.selectedPiece?.sel_type == SelectableType.Space){

        let [x, y] = [this.selectedPiece.x,  this.selectedPiece.y];
        this.board.build(x, y);

        this.validSpaces = [];

        this.selectedPiece = undefined;
        this.movingBuilder = undefined;

        // change game state
        gameState = "move";
      }
    }

    this.validSpaces.forEach(s => s.normal());
    this.hoveredPiece = undefined;
  }
}


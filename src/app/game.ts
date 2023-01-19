import {
  AmbientLight,
  AxesHelper,
  DirectionalLight,
  GridHelper,
  Scene,
} from "three";

import { Board3D } from "./view/game/board3D";
import { Selectable, SelectableType } from "./view/game/selectable";

import GameManager from "./model/gameManager";
import OfflineGameManager from "./model/offlineGameManager";

let gameState = "place";

export default class Game {
  scene: Scene;

  board: Board3D;

  axesHelper: AxesHelper;
  gridHelper: GridHelper;
  ambientLight: AmbientLight;
  directionalLight: DirectionalLight;

  gameManager: GameManager;

  hoveredPiece: Selectable | undefined;
  selectedPiece: Selectable | undefined;
  movingBuilder: Selectable | undefined;

  validSpaces: Selectable[] = [];

  constructor(scene: Scene) {
    this.scene = scene;

    this.board = new Board3D();
    this.scene.add(this.board);

    this.gameManager = new OfflineGameManager();

    this.gridHelper = new GridHelper(11, 11);
    this.scene.add(this.gridHelper);
    this.ambientLight = new AmbientLight(0x404040);
    this.scene.add(this.ambientLight);
    this.directionalLight = new DirectionalLight(0xffffff, 0.5);
    this.scene.add(this.directionalLight);

    this.axesHelper = new AxesHelper(5);
    this.scene.add(this.axesHelper);

    this.validSpaces = this.board.spaces.flat().filter((s) => s.available());
    this.validSpaces.forEach((s) => s.normal());
  }

  getSelectablePieces(): Selectable[] {
    switch (gameState) {
      case "place":
        return this.validSpaces;
      case "move":
        const builders: Selectable[] = this.board.getBuilders();
        return builders.concat(this.validSpaces);
      case "build":
        return this.validSpaces;
      default:
        console.log("Invalid game state");
        return [] // not reachable under normal circumstances
    }
  }

  hover(hovered: Selectable | undefined) {
    this.hoveredPiece = hovered;
  }

  resetPiece() {
    this.hoveredPiece?.normal();
  }

  update(delta: number) {
    this.hoveredPiece?.highlight();
    this.board.update(delta);
  }

  onClick(selectable: Selectable) {

    this.validSpaces.forEach((s) => s.reset());
    // get now clicked piece
    this.selectedPiece = selectable;

    if (this.selectedPiece){
      let plays = this.gameManager.getPlays();
      console.log(plays);
    }

    if (gameState == "place") {
      if (this.selectedPiece?.sel_type == SelectableType.Space) {
        let [x, y] = [this.selectedPiece.x, this.selectedPiece.y];
        this.board.placeBuilder(x, y);
        this.validSpaces = this.board.spaces
          .flat()
          .filter((s) => s.available());
      }

      if (this.board.builders.length == 4) {
        this.validSpaces.forEach((s) => s.reset());
        this.validSpaces = [];

        gameState = "move";
      }
    } else if (gameState == "move") {
      if (this.selectedPiece?.sel_type == SelectableType.Builder) {
        this.movingBuilder?.normal();
        this.movingBuilder = this.selectedPiece;

        this.selectedPiece.highlight();

        let [x, y] = [this.selectedPiece.x, this.selectedPiece.y];
        this.validSpaces = this.board
          .getAdjacentSpaces(x, y)
          .filter((s) => s.available())
          .filter(
            (s) => s.pieces.length < this.board.getSpace(x, y).pieces.length + 1
          );
      } else if (this.selectedPiece?.sel_type == SelectableType.Space) {
        if (!this.movingBuilder) return;
        let [x_src, y_src] = [this.movingBuilder.x, this.movingBuilder.y];
        let [x_dest, y_dest] = [this.selectedPiece.x, this.selectedPiece.y];
        this.board
          .getSpace(x_dest, y_dest)
          .movePiece(this.board.getSpace(x_src, y_src));

        this.validSpaces = this.board
          .getAdjacentSpaces(x_dest, y_dest)
          .filter((s) => s.available());

        this.movingBuilder = undefined;

        gameState = "build";
      }
    } else if (gameState == "build") {
      if (this.selectedPiece?.sel_type == SelectableType.Space) {
        let [x, y] = [this.selectedPiece.x, this.selectedPiece.y];
        this.board.build(x, y);

        this.validSpaces = [];

        this.selectedPiece = undefined;
        this.movingBuilder = undefined;

        gameState = "move";
      }
    }

    this.validSpaces.forEach((s) => s.normal());
    this.hoveredPiece = undefined;
  }
}

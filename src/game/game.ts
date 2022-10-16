import {
  Scene,
  DirectionalLight,
  AmbientLight,
  AxesHelper,
  GridHelper,
  Mesh
} from "three";

import { Board, Move, MoveType } from "./board";
import {Selectable} from "./selectable";

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
    this.gridHelper.position.set(2,0,2);
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

  }

  getSelectablePieces(): Mesh[] { return this.board.getSelectablePieces(); }

  hover(hovered: Selectable | undefined) {this.board.hover(hovered);}

  resetPiece(){ this.board.resetPiece(); }

  update(){this.board.update();}

  onClick(){this.board.onClick();}
}

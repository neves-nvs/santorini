import {
  Scene,
  DirectionalLight,
  AmbientLight,
  AxesHelper,
  GridHelper,
  Vector2
} from "three";

import { Board, Move, MoveType } from "./board";
import {Piece} from "./piece";

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

    this.board.play(new Move(MoveType.Place_Builder, new Vector2(0, 0)));
    this.board.play(new Move(MoveType.Place_Builder, new Vector2(1, 1)));
    this.board.play(new Move(MoveType.Place_Builder, new Vector2(3, 3)));

  }

  getSelectablePieces(): Piece[] {return this.board.getSelectablePieces()}

  hoverPiece(piece: Piece | undefined): void{this.board.hoverPiece(piece);}

  resetPiece(){ this.board.resetPiece(); }

  update(){this.board.update();}

  onClick(){this.board.onClick();}
}

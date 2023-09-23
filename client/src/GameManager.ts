import Block from "./Block";
import BoardManager from "./BoardManager";
import Builder from "./Builder";

const MAX_BASE_COUNT = 22;
const MAX_MID_COUNT = 18;
const MAX_TOP_COUNT = 14;
const MAX_DOME_COUNT = 18;

export default class GameManager {
  private boardManager: BoardManager;

  constructor(boardManager: BoardManager) {
    this.boardManager = boardManager;
    this.boardManager.place(new Builder(), 0, 1);
    this.boardManager.place(new Builder(), 0, 1);
    this.boardManager.place(new Block("BASE"), 2, 2);
    this.boardManager.place(new Block("MID"), 2, 2);
    this.boardManager.place(new Block("TOP"), 2, 2);
    this.boardManager.place(new Block("DOME"), 2, 2);
  }

  update(delta: number) {
  }
  // Game Functionality
}
import SceneManager from "./SceneManager";
import Board3D from "./components/Board3D";

export default class BoardManager {
  private sceneManager: SceneManager;
  private board: Board3D = new Board3D();

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;

    this.sceneManager.add(this.board);
  }

  buildBoard() {
    // TODO
  }

  update(delta: number) {
    this.board.update(delta);
  }
}

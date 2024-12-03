import "./style.css"; // todo investigate more about css in js

import BoardManager from "./view/BoardManager";
// import { Clock } from "three";
import GameManager from "./view/GameManager";
import InputManager from "./view/InputManager";
import NetworkManager from "./controller/NetworkManager";
import SceneManager from "./view/SceneManager";

class Main {
  // private clock = new Clock();
  // private delta: number;

  // view
  private sceneManager: SceneManager;
  private boardManager: BoardManager;
  private gameManager: GameManager;
  private inputManager: InputManager;

  // controller
  private networkManager: NetworkManager;

  constructor(canvas: HTMLElement) {
    this.sceneManager = new SceneManager(canvas as HTMLElement);
    this.boardManager = new BoardManager(this.sceneManager);
    this.gameManager = new GameManager(this.boardManager);
    this.inputManager = new InputManager(this.sceneManager, this.gameManager);

    this.networkManager = new NetworkManager(this.gameManager);

    // this.delta = Math.min(this.clock.getDelta(), 0.1);
    // this.delta = this.clock.getDelta();
  }

  public update() {
    // this.delta = Math.min(this.clock.getDelta(), 0.1);
    // this.delta = this.clock.getDelta();

    this.sceneManager.update();
    this.boardManager.update();
    // this.gameManager.update(this.delta);

    this.inputManager.update();
    this.sceneManager.render();
  }

  public getNetworkManager() {
    return this.networkManager;
  }

  public getGameManager() {
    return this.gameManager;
  }
}
const canvas = document.querySelector("canvas");
if (canvas == null) throw new Error("Canvas not found");

export const main = new Main(canvas as HTMLElement);

function start() {
  requestAnimationFrame(start);
  main.update();
}

start();

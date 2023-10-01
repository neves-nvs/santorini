import "./style.css"; // todo investigate more about css in js

import BoardManager from "./BoardManager";
import { Clock } from "three"; // todo investigate where clock should be placed
import GameManager from "./GameManager";
import InputManager from "./InputManager";
import NetworkManager from "./NetworkManager";
import SceneManager from "./SceneManager";

class Main {
  private clock = new Clock();
  private delta: number;

  private sceneManager: SceneManager;
  private boardManager: BoardManager;
  private networkManager: NetworkManager;
  private gameManager: GameManager;
  private inputManager: InputManager;

  constructor(canvas: HTMLElement) {
    this.sceneManager = new SceneManager(canvas as HTMLElement);

    this.boardManager = new BoardManager(this.sceneManager);

    this.networkManager = new NetworkManager();

    this.gameManager = new GameManager(this.boardManager, this.networkManager);

    this.inputManager = new InputManager(this.sceneManager, this.gameManager);

    this.delta = Math.min(this.clock.getDelta(), 0.1);
  }

  public update() {
    this.delta = Math.min(this.clock.getDelta(), 0.1); // TODO look into this

    this.sceneManager.update(this.delta);
    this.boardManager.update(this.delta);
    this.gameManager.update(this.delta);
    this.inputManager.update();

    this.sceneManager.render();
  }
}

const canvas = document.querySelector("canvas");
if (canvas == null) throw new Error("Canvas not found");

const main: Main = new Main(canvas as HTMLElement);

function start() {
  requestAnimationFrame(start);
  main.update();
}

start();

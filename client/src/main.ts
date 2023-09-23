import "./style.css"; // todo investigate more about css in js

import BoardManager from "./BoardManager";
import { Clock } from "three"; // todo investigate where clock should be placed
import GameManager from "./GameManager";
import InputManager from "./InputManager";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import SceneManager from "./SceneManager";

class Main {
  private clock = new Clock();
  private delta: number;

  private sceneManager: SceneManager;
  private boardManager: BoardManager;
  private gameManager: GameManager;
  private inputManager: InputManager;

  constructor(canvas: HTMLElement) {
    this.sceneManager = new SceneManager(canvas as HTMLElement);

    this.boardManager = new BoardManager(this.sceneManager);

    this.gameManager = new GameManager(this.boardManager);

    const controls = new OrbitControls(
      this.sceneManager.getCamera(),
      this.sceneManager.getRenderer().domElement,
    );
    this.inputManager = new InputManager(this.sceneManager, controls); // todo input manager should interact with gameManager instead of InputManager because only it know the state of piecesw

    this.delta = Math.min(this.clock.getDelta(), 0.1);
  }

  public update() {
    // TODO pass delta to update functions
    this.delta = Math.min(this.clock.getDelta(), 0.1); // TODO look into this

    this.sceneManager.update(this.delta);
    this.boardManager.update(this.delta);
    this.gameManager.update(this.delta); // 1. Update the game manager, including turns
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

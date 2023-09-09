import "./style.css";
import SceneManager from "./SceneManager";
import InputManager from "./InputManager";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Clock } from "three";

class Main {
  private clock = new Clock();
  private delta: number;

  private sceneManager: SceneManager;
  private inputManager: InputManager;

  constructor(canvas: HTMLElement) {
    this.sceneManager = new SceneManager(canvas as HTMLElement);

    this.delta = Math.min(this.clock.getDelta(), 0.1);

    const controls = new OrbitControls(
      this.sceneManager.getCamera(),
      this.sceneManager.getRenderer().domElement,
    );
    this.inputManager = new InputManager(this.sceneManager, controls);
  }

  public update() {
    // TODO pass delta to update functions
    this.delta = Math.min(this.clock.getDelta(), 0.1); // TODO look into this

    this.sceneManager.update(this.delta);
    // gameLogicManager.update();     // 2. Update the game logic, including turns
    this.inputManager.update();
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

// Nertwork Manager
// import { io } from "socket.io-client";
// let serverAddress = "http://localhost:3000";
// const socket = io(serverAddress)
// socket.on("connection", () => { console.log("connected") })
// socket.on("hello", () => { console.log("hello") })

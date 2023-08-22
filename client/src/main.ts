import "./style.css";

import { SceneManager } from "./Scene/SceneManager";

class Main {
  private sceneManager: SceneManager;

  constructor() {
    const canvas = document.querySelector("canvas");
    if (canvas == null) throw new Error("Canvas not found");
    
    this.sceneManager = new SceneManager(canvas as HTMLElement);
  }

  public update(){
    this.sceneManager.update();
  }

}

let main: Main = new Main(); 

function start(){
  requestAnimationFrame(start);
  main.update();
}

start();

// import { io } from "socket.io-client";
// let serverAddress = "http://localhost:3000";
// const socket = io(serverAddress)
// socket.on("connection", () => { console.log("connected") })
// socket.on("hello", () => { console.log("hello") })

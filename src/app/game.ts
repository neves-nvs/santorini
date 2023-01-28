import { AmbientLight, AxesHelper, DirectionalLight, GridHelper, Scene, } from "three";

import { Board3D } from "./view/board3D";

import GameManager, { Play } from "./model/gameManager";
import OfflineGameManager from "./model/offlineGameManager";
import { Clickable } from "./model/model";
import Player from "./model/player";
import Button from "./view/button";

export default class Game {
  scene: Scene;

  board: Board3D;

  axesHelper = new AxesHelper(5);
  gridHelper = new GridHelper(11, 11);
  ambientLight = new AmbientLight(0x404040);
  directionalLight = new DirectionalLight(0xffffff, 0.5);

  gameManager: GameManager;

  clickable: Button[] = [];

  constructor(scene: Scene) {
    this.scene = scene;

    this.board = new Board3D();
    this.scene.add(this.board);

    this.scene.add(this.gridHelper);
    this.scene.add(this.ambientLight);
    this.scene.add(this.directionalLight);
    this.scene.add(this.axesHelper);

    this.gameManager = new OfflineGameManager();
    this.gameManager.addPlayer(new Player("Miguel"));
    this.gameManager.addPlayer(new Player("Afonso"));
    this.gameManager.start();

    let plays = this.gameManager.getPlays();
    plays.forEach(p => this.showPlay(p));
  }

  getSelectablePieces(): Button[] {
    return this.clickable;
  }

  update(delta: number) {
    this.board.update(delta);
  }

  onClick(pressed: Button){
    // get play stored on button
    let optPlay = pressed.click();
    console.log(optPlay == undefined);
    if (optPlay == undefined) return;
    let play = optPlay;
    console.log(play);

    // play on 3D Model and send to game manager
    this.play(play);
    this.gameManager.play(play);
    this.clickable.forEach(c => c.clear());
    this.clickable = [];

    // get next play
    let plays = this.gameManager.getPlays();
    plays.forEach(p => this.showPlay(p));

    console.log(this.gameManager);
    console.log(this.board);
  }

  showPlay(play: Play){
    switch (play.click){
      case Clickable.SPACE:
        this.spaceShowPlayHandler(play);
        break;
      case Clickable.BUILDER:
        this.builderShowPlayHandler(play);
        break;
    }
  }

  spaceShowPlayHandler(play: Play){
    let space = this.board.getSpace(play.position);
    space.setPlay(play);
    this.clickable.push(space);
  }

  builderShowPlayHandler(play: Play){
    let space = this.board.getSpace(play.position);
    console.log(space)
  }

  play(play: Play){
    switch(play.click) {
      case Clickable.SPACE:
        this.spacePlayHandler(play);
        break;
      case Clickable.BUILDER:
        this.builderPlayHandler(play);
        break;

    }
  }

  spacePlayHandler(play: Play){
    let turnPhase = this.gameManager.getTurnPhase();
    switch (turnPhase){
      case "PLACE":
        this.board.placeBuilder(play.position);
        break;
      case "BUILD":
        this.board.build(play.position);
        break;
    }
  }

  builderPlayHandler(play: Play){
    console.log(play);
  }
}

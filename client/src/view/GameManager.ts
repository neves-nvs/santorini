import Block from "./components/Block";
import { BlockType } from "model/BlockType";
import BoardManager from "./BoardManager";
import Builder from "./components/Builder";
import EventEmitter from "eventemitter3";
import Piece from "./components/Piece";
import { Position } from "position";
import { eventEmitter } from "../Events";

export default class GameManager extends EventEmitter {
  private boardManager: BoardManager;
  private gameId: string | null;
  private username: string | null;

  constructor(boardManager: BoardManager) {
    super();
    this.boardManager = boardManager;
    this.gameId = localStorage.getItem("gameId");
    this.username = localStorage.getItem("username");

    this.boardManager.place(new Builder(), 0, 1);
    // this.boardManager.place(new Builder(), 0, 0);

    // this.boardManager.place(new Block("BASE"), 2, 2);
    // this.boardManager.place(new Block("MID"), 2, 2);
    // this.boardManager.place(new Block("TOP"), 2, 2);
    // this.boardManager.place(new Block("DOME"), 2, 2);

    // this.boardManager.place(new Block("BASE"), 3, 3);
    // this.boardManager.place(new Block("MID"), 3, 3);
    // this.boardManager.place(new Block("TOP"), 3, 3);
    // this.boardManager.place(new Block("DOME"), 3, 3);
  }

  getUsername() {
    return this.username;
  }

  setUsername(username: string) {
    this.username = username;
    localStorage.setItem("username", username);
    eventEmitter.emit("username-update", username);
  }

  resetUsername() {
    this.username = null;
  }

  getGameID() {
    return this.gameId;
  }

  setGameID(gameId: string) {
    this.gameId = gameId;
    localStorage.setItem("gameId", gameId);
  }

  resetGameID() {
    this.gameId = null;
  }

  // update(delta: number) {}

  placeWorker(x: number, y: number) {
    this.boardManager.place(new Builder(), x, y);
  }

  moveWorker({ x, y }: Position, { x: newX, y: newY }: Position) {
    this.boardManager.moveWorker(x, y, newX, newY);
  }

  buildBlock({ x, y }: Position, type: BlockType) {
    this.boardManager.place(new Block(type), x, y);
  }

  // TODO feels out of place here
  getClickablePieces(): Piece[] {
    return this.boardManager.getPieces();
    //.filter(piece => piece.isClickable());
  }
}
import { Mesh } from "three";
import Space from "./components/Space";
import Stack from "./components/Stack";
import Piece from "./components/Piece";
import SceneManager from "./SceneManager";
import { getBoardMesh } from "./STLLoader";

export enum SpaceShade {
  Light = 0x51a832,
  Dark = 0x265c13,
}

export default class BoardManager {
  private sceneManager: SceneManager;
  private board?: Mesh;
  private stacks: Stack[][];
  private pieces: Piece[] = [];
  private spaces: Space[][];

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.initiateBoard();

    this.stacks = new Array(5);
    let stack;
    for (let x = 0; x < 5; x++) {
      this.stacks[x] = new Array(5);
      for (let z = 0; z < 5; z++) {
        let shade: SpaceShade;
        if (z % 2 == 0) {
          shade = x % 2 == 0 ? SpaceShade.Light : SpaceShade.Dark;
        } else {
          shade = x % 2 == 0 ? SpaceShade.Dark : SpaceShade.Light;
        }
        stack = new Stack(shade);
        stack.position.set(x, 0, z);
        this.stacks[x][z] = stack;
        this.sceneManager.add(stack);
      }
    }

    this.spaces = new Array(5);
    for (let x = 0; x < 5; x++) {
      this.spaces[x] = new Array(5);
      for (let y = 0; y < 5; y++) {
        const space = new Space(SpaceShade.Light);
        space.position.set(x, 0, y);
        this.spaces[x][y] = space;
        this.sceneManager.add(space);
      }
    }
  }

  async initiateBoard() {
    if (this.board) {
      this.sceneManager.remove(this.board);
    }
    this.board = getBoardMesh();
    this.sceneManager.add(this.board);
  }

  public getMesh() {
    return this.board;
  }

  public getPieces() {
    return this.pieces;
  }

  public update() {
    this.updateStacks();
  }

  private updateStackHeight(stack: Stack) {
    let height = 0;
    stack.getPieces().forEach((piece) => {
      piece.position.setY(height);
      height += piece.getHeight();
    });
  }

  private updateStacks() {
    this.stacks.forEach((stacksList) => {
      stacksList.forEach((stack) => {
        this.updateStackHeight(stack);
      });
    });
  }

  public place(piece: Piece, x: number, y: number) {
    this.sceneManager.add(piece);
    piece.position.set(x, 0, y);
    this.stacks[x][y].addPiece(piece);
    this.pieces.push(piece);
  }

  public moveWorker(x: number, y: number, newX: number, newY: number) {
    const piece = this.stacks[x][y].removePiece();
    if (!piece) {
      throw new Error(`Builder not found at ${x}, ${y}`);
    }
    this.stacks[newX][newY].addPiece(piece);
  }
}

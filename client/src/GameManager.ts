import Block from "./components/Block";
import BoardManager from "./BoardManager";
import Builder from "./components/Builder";
import NetworkManager from "./NetworkManager";
import Piece from "./components/Piece";
import eventManager from "./EventManager";

const MAX_BASE_COUNT = 22;
const MAX_MID_COUNT = 18;
const MAX_TOP_COUNT = 14;
const MAX_DOME_COUNT = 18;

export default class GameManager {
  private boardManager: BoardManager;
  private networkManager: NetworkManager;

  constructor(boardManager: BoardManager, networkManager: NetworkManager) {
    this.boardManager = boardManager;
    this.networkManager = networkManager;

    // eventManager.on('playerClick', ({ player }) => { // handle object click
    //   const action = { type: 'click', player: player.id };
    //   this.networkManager.sendMessage(action);
    // });
    
    eventManager.on(eventManager.GAME_ACTION, (action: any) => {
      // Handle the game action here
      this.handleGameAction(action);
    });

    this.boardManager.place(new Builder(), 0, 1);
    this.boardManager.place(new Builder(), 0, 1);
    this.boardManager.place(new Block("BASE"), 2, 2);
    this.boardManager.place(new Block("MID"), 2, 2);
    this.boardManager.place(new Block("TOP"), 2, 2);
    this.boardManager.place(new Block("DOME"), 2, 2);
  }

  update(delta: number) { }

  public getClickablePieces(): Piece[] {
    return this.boardManager.getPieces();
    //.filter(piece => piece.isClickable());
  }

  private async handleGameAction(action: any) { // todo change to apply first and if invalid, then revert
    const isValid = await this.validateActionWithServer(action);

    if (isValid) {
      this.applyGameActionLocally(action);
    } else {
      this.handleInvalidAction(action);
    }
  }
  
  private async validateActionWithServer(action: any): Promise<boolean> {
    const isValid = await this.networkManager.validatePlayerAction(action);
    return isValid;
  }

  private applyGameActionLocally(action: any) {
    // TODO
  }

  private handleInvalidAction(action: any) {
    throw new Error("Method not implemented."); // TODO show HTMLElement
  }

}

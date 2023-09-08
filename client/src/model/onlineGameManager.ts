import GameManager, { TurnPhase } from "./GameManager";
import Player from "./Player";
import Play from "../common/messages";

export default class OnlineGameManager implements GameManager {
  turnPhase: TurnPhase;

  constructor() {
    this.turnPhase = "NOT_STARTED";
  }

  start(): void {}

  getPlays(): Play[] {
    return [];
  }

  play(play: Play) {
    console.log(play);
  }

  addPlayer(player: Player) {
    console.log(player); // suppressing error
  }
}

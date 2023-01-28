import GameManager, { Play } from "./gameManager";
import Player from "./player";
import {TurnPhase} from "./offlineGameManager";

export default class OnlineGameManager implements GameManager {
    turnPhase: TurnPhase;

    constructor() {
        this.turnPhase = "NOT_STARTED";
    }

    start(): void {
    }

    getPlays(): Play[] {
        return [];
    }

    play(play: Play) {
        console.log(play);
    }

    addPlayer(player: Player) {
        console.log(player) // supressing error
    }

    getTurnPhase(): TurnPhase {
        return this.turnPhase;
    }


}
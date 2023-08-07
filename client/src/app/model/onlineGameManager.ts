import GameManager, {TurnPhase} from "./gameManager";
import Player from "./player";
import Play from "../view/messages";

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
        console.log(player) // suppressing error
    }
}
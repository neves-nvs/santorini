import {Clickable, Position} from "./model";
import Player from "./player";
import { TurnPhase } from "./offlineGameManager";

export default interface GameManager {
    turnPhase: TurnPhase;

    start(): void;

    addPlayer(player: Player): void;

    getPlays(): Play[];

    play(play: Play): void;

    getTurnPhase(): TurnPhase;
}

export class Play {
    click: Clickable;
    position: Position;

    constructor(click: Clickable, position: Position) {
        this.click = click;
        this.position = position;
    }
}
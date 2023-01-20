import { Clickable, Position } from "./gameModel";

export default interface GameManager {
    start(): void;

    getPlays(): Play[];

    play(play: Play): void;
}

export class Play {
    click: Clickable;
    position: Position;

    constructor(click: Clickable, position: Position) {
        this.click = click;
        this.position = position;
    }
}
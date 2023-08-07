import Position from "../common/position";

export type PlayType = "PLACE" | "MOVE" | "BUILD"

export default class Play {
    type: PlayType;
    source: Position;
    destiny: Position | undefined;

    constructor(type: PlayType, source: Position, destiny? : Position) {
        this.type = type;
        this.source = source;
        this.destiny = destiny;
    }

}
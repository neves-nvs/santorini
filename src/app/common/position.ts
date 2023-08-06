export default class Position {
    x: number;
    y: number;

    constructor(x: number, y: number) { [this.x, this.y] = [x, y]; }

    destructure() { return [this.x, this.y]; }
}
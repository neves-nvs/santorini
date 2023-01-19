import { GameManager, Play } from "./gameManager";

export default class OnlineGameManager implements GameManager{

    start(): void {
    }

    getPlays(): Play[] {
        return [];
    }

    play(play: Play): void {
        console.log(play);
    }

}
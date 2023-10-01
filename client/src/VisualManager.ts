import GameManager from "./GameManager";
import SceneManager from "./SceneManager";

export default class VisualManager {
    private sceneManager: SceneManager;
    private gameManager: GameManager;

    constructor(sceneManager: SceneManager, gameManager: GameManager) {
        this.sceneManager = sceneManager;
        this.gameManager = gameManager;
    }

    public update(delta: number) {
        // compute changed pieces
        // reset changed pieces
        // change and record new pieces
    }
}
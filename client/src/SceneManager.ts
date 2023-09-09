import {
  AmbientLight,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import Game from "./components/Game";

export default class SceneManager {
  private scene: Scene;
  private renderer: WebGLRenderer;
  private camera: PerspectiveCamera;

  private game: Game;

  constructor(canvas: HTMLElement) {
    this.scene = new Scene();

    this.renderer = new WebGLRenderer({
      canvas: canvas as HTMLElement,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x87ceeb, 1);

    this.camera = new PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.setZ(5);
    this.camera.position.setX(5);
    this.camera.position.setY(5);

    let ambientLight = new AmbientLight(0x404040);
    this.scene.add(ambientLight);
    let directionalLight = new DirectionalLight(0xffffff, 0.5);
    this.scene.add(directionalLight);

    this.game = new Game(this.scene);
  }

  getCamera() {
    return this.camera;
  }

  getRenderer() {
    return this.renderer;
  }

  getGame() {
    return this.game;
  }

  public update(delta: number) {
    this.renderer.render(this.scene, this.camera);

    this.game.update(delta);
  }
}

import {
  AmbientLight,
  DirectionalLight,
  Object3D,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";

export default class SceneManager {
  private scene: Scene;
  private renderer: WebGLRenderer;
  private camera: PerspectiveCamera;

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

    const aspectRatio = window.innerWidth / window.innerHeight;
    this.camera = new PerspectiveCamera(45, aspectRatio, 0.1, 1000);
    this.camera.position.setZ(5);
    this.camera.position.setX(5);
    this.camera.position.setY(5);

    let ambientLight = new AmbientLight(0x404040);
    this.scene.add(ambientLight);
    let directionalLight = new DirectionalLight(0xffffff, 0.5);
    this.scene.add(directionalLight);
  }

  add(object: Object3D) {
    this.scene.add(object);
  }

  remove(object: Object3D) {
    this.scene.remove(object);
  }

  getCamera() {
    return this.camera;
  }

  getRenderer() {
    return this.renderer;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  public update(delta: number) {}
}

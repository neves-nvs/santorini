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

  // public getSelectableButtons(): Button[] {
  //   let selectable: Button[] = [];
  //   this.board.spaces
  //     .flat() // list of all spaces
  //     .map((space) => space.getActiveButtons()) // map each space into the list of its selectable pisces
  //     .flat()
  //     .forEach((b) => selectable.push(b)); // add to return
  //   this.board.spaces
  //     .flat() // all spaces
  //     //.filter(b => b.play != undefined) // filter to only spaces with plays
  //     .forEach((space) => selectable.push(space)); // add to return
  //   return selectable;
  // }
}

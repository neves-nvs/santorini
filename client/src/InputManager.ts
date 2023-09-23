import { Intersection, Mesh, Raycaster, Vector2 } from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import SceneManager from "./SceneManager";

const MOUSE_DELTA: number = 5;

export default class InputManager {
  private sceneManager: SceneManager;

  private controls: OrbitControls | undefined;

  private pointer = new Vector2();
  private raycaster = new Raycaster();
  private startX: number = 0; //? initialized to prevent undefined
  private startY: number = 0;

  constructor(sceneManager: SceneManager, controls: OrbitControls) {
    this.sceneManager = sceneManager;

    // todo maybe controls dont need dependency injection
    this.controls = controls;
    this.controls.target.set(2, 0, 2); // todo set constants
    this.controls.maxPolarAngle = Math.PI / 2;

    window.addEventListener("resize", this.onWindowResize.bind(this));
    window.addEventListener("mousedown", this.onMouseDown.bind(this));
    window.addEventListener("mouseup", this.onMouseUp.bind(this));
    window.addEventListener("mousemove", this.onMouseMove.bind(this));
  }

  update() {
    this.controls?.update();

    this.hoverButton();
  }

  public onWindowResize() {
    // todo should call function from face of a manager
    let width: number = window.innerWidth;
    let height: number = window.innerHeight;

    // this.sceneManager.resize(width, height)
    this.sceneManager
      .getRenderer()
      .setSize(window.innerWidth, window.innerHeight);
    this.sceneManager.getCamera().aspect = width / height;
    this.sceneManager.getCamera().updateProjectionMatrix();
  }

  public onMouseDown(event: MouseEvent) {
    this.startX = event.pageX;
    this.startY = event.pageY;
  }

  public onMouseUp(event: MouseEvent) {
    const diffX = Math.abs(event.pageX - this.startX);
    const diffY = Math.abs(event.pageY - this.startY);

    if (diffX < MOUSE_DELTA && diffY < MOUSE_DELTA) {
      this.clickButton(); // todo should call function from facade of a manager
    }
  }

  public onMouseMove(event: MouseEvent) {
    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both model
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private hoverButton() {
    this.interceptButton()?.hover(); // todo should call from facade
  }

  private clickButton() {
    this.interceptButton(); //?.click(); // todo should call from facade
  }

  private interceptButton(): Button | undefined {
    return; // TODO
    this.raycaster.setFromCamera(this.pointer, this.sceneManager.getCamera());
    const selectable: Mesh[] = this.sceneManager;
    //.getSelectableButtons()
    //.map((s) => s.mesh);
    if (selectable.length == 0) return;
    const intersects: Intersection[] =
      this.raycaster.intersectObjects(selectable);
    const distance: number = Math.min(
      ...intersects.map(({ distance }) => distance),
    );
    const closest: Intersection = intersects.filter(
      intersection => intersection.distance == distance,
    )[0];
    return closest?.object.parent as unknown as Button;
  }
}

import { Raycaster, Vector2 } from "three";

import GameManager from "./GameManager";
import { MathUtils } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Piece from "./components/Piece";
import SceneManager from "./SceneManager";

const MOUSE_DELTA: number = 5;
export default class InputManager {
  private sceneManager: SceneManager;
  private gameManager: GameManager;

  private controls: OrbitControls | undefined;

  private pointer = new Vector2();
  private raycaster = new Raycaster();
  private startX?: number;
  private startY?: number;

  constructor(sceneManager: SceneManager, gameManager: GameManager) {
    this.sceneManager = sceneManager;

    this.controls = this.createOrbitControls();

    this.gameManager = gameManager;

    window.addEventListener("resize", this.onWindowResize.bind(this));
    window.addEventListener("mousedown", this.onMouseDown.bind(this));
    window.addEventListener("mouseup", this.onMouseUp.bind(this));
    window.addEventListener("mousemove", this.onMouseMove.bind(this));
  }

  update() {
    this.controls?.update();

    const piece = this.interceptPiece();
    if (piece != undefined) {
      console.log(`Hovering over piece: ${piece.id}`);
    }
    //this.hoverButton();
  }

  private createOrbitControls() {
    const camera = this.sceneManager.getCamera();
    const renderer = this.sceneManager.getRenderer();
    const controls = new OrbitControls(camera, renderer.domElement);

    controls.enableDamping = true;
    controls.enableZoom = false;
    controls.target.set(2, 0, 2); // todo set constants
    controls.maxPolarAngle = Math.PI / 2;

    this.controls = controls;
    return controls;
  }

  public onWindowResize() {
    const width: number = window.innerWidth;
    const height: number = window.innerHeight;

    const renderer = this.sceneManager.getRenderer();
    const camera = this.sceneManager.getCamera();

    renderer.setSize(width, height); // this.sceneManager.resize(width, height)
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // TODO make this work a little better (working tho)
    const aspect = width / height;
    const boardWidth = 6;
    const boardHeight = 6;
    const fov = camera.fov * (Math.PI / 180); // Convert FOV to radians
    const cameraHeight = Math.max(
      boardHeight / (2 * Math.tan(fov / 2)),
      boardWidth / (2 * aspect * Math.tan(fov / 2)),
    );
    camera.position.set(0, cameraHeight, cameraHeight);
    camera.lookAt(0, 0, 0);
  }

  public onMouseDown(event: MouseEvent) {
    this.startX = event.pageX;
    this.startY = event.pageY;
  }

  public onMouseUp(event: MouseEvent) {
    if (this.startX == undefined || this.startY == undefined) return;
    const diffX = Math.abs(event.pageX - this.startX);
    const diffY = Math.abs(event.pageY - this.startY);

    if (diffX < MOUSE_DELTA && diffY < MOUSE_DELTA) {
      //this.click(); // todo should call function from facade of a manager
    }
  }

  public onMouseMove(event: MouseEvent) {
    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both model
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private hoverButton() {
    // this.interceptButton()?.hover(); // todo should call from facade
  }

  private interceptPiece(): Piece | undefined {
    this.raycaster.setFromCamera(this.pointer, this.sceneManager.getCamera());
    const clickable: Piece[] = this.gameManager.getClickablePieces();
    if (clickable.length == 0) return;

    const intersections = this.raycaster.intersectObjects(clickable);
    if (intersections.length == 0) return;
    const distance: number = Math.min(
      ...intersections.map(({ distance }) => distance),
    );

    const closest = intersections.filter(
      intersection => intersection.distance == distance,
    )[0];
    return closest.object as Piece;
  }
}

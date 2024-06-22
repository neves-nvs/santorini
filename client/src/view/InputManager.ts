import { Object3D, Raycaster, Vector2 } from "three";

import GameManager from "./GameManager";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Piece from "./components/Piece";
import SceneManager from "./SceneManager";

const MOUSE_DELTA: number = 5;

// export default class InputManager extends EventEmitter {
export default class InputManager {
  private sceneManager: SceneManager;
  private gameManager: GameManager;

  private controls: OrbitControls | undefined;

  private pointer = new Vector2();
  private raycaster = new Raycaster();
  private startX?: number;
  private startY?: number;

  private hoveredPiece: Piece | undefined;

  constructor(sceneManager: SceneManager, gameManager: GameManager) {
    this.sceneManager = sceneManager;

    this.controls = this.createOrbitControls();

    this.gameManager = gameManager;

    window.addEventListener("resize", this.onWindowResize.bind(this));
    window.addEventListener("mousedown", this.onMouseDown.bind(this));
    window.addEventListener("mouseup", this.onMouseUp.bind(this));
    window.addEventListener("mousemove", this.onMouseMove.bind(this));

    this.hoveredPiece = undefined;
  }

  update() {
    this.controls?.update();

    // const piece = this.interceptPiece();
    // if (this.hoveredPiece != undefined) {
    //   console.log(`Hovering over piece: ${piece.id}`);
    //   this.sceneManager.hover(piece);
    // }

    this.hoverPiece();
  }

  /* -------------------------------------------------------------------------- */
  /*                                   CAMERA                                   */
  /* -------------------------------------------------------------------------- */

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

  private onWindowResize() {
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
    const fov = camera.fov * (Math.PI / 180);
    const cameraHeight = Math.max(
      boardHeight / (2 * Math.tan(fov / 2)),
      boardWidth / (2 * aspect * Math.tan(fov / 2)),
    );
    camera.position.set(0, cameraHeight, cameraHeight);
    camera.lookAt(0, 0, 0);
  }

  /* -------------------------------------------------------------------------- */
  /*                                    MOUSE                                   */
  /* -------------------------------------------------------------------------- */

  private onMouseDown(event: MouseEvent) {
    this.startX = event.pageX;
    this.startY = event.pageY;
  }

  private onMouseUp(event: MouseEvent) {
    if (this.startX == undefined || this.startY == undefined) return;
    const diffX = Math.abs(event.pageX - this.startX);
    const diffY = Math.abs(event.pageY - this.startY);

    if (diffX < MOUSE_DELTA && diffY < MOUSE_DELTA) {
      //this.click(); // todo should call function from facade of a manager
    }
  }

  private onMouseMove(event: MouseEvent) {
    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both model
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  /* -------------------------------------------------------------------------- */
  /*                                   VISUALS                                  */
  /* -------------------------------------------------------------------------- */

  private hoverPiece() {
    const hoveredPiece: Piece | undefined = this.interceptPiece();
    if (hoveredPiece === this.hoveredPiece) return;
    // console.log(`Hovering: ${hoveredPiece?.constructor.name}`);

    this.hoveredPiece?.unhover();

    hoveredPiece?.hover();
    this.hoveredPiece = hoveredPiece;
    this.hoveredPiece?.hover();

    hoveredPiece?.hover();
  }

  private interceptPiece(): Piece | undefined {
    this.raycaster.setFromCamera(this.pointer, this.sceneManager.getCamera());
    const clickable: Piece[] = this.gameManager.getClickablePieces();
    if (clickable.length == 0) return undefined;

    const intersected = this.raycaster.intersectObjects(clickable);
    if (intersected.length == 0) return undefined;

    const closest = intersected[0].object as Piece;
    const piece = this.findParentPiece(closest);
    if (piece == undefined) {
      console.warn("Could not find parent piece");
    }
    return piece;
  }

  private findParentPiece(object: Object3D): Piece | undefined {
    if (object instanceof Piece) {
      return object;
    }

    if (object.parent) {
      return this.findParentPiece(object.parent);
    }

    return undefined;
  }
}

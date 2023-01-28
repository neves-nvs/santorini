import "./style.css";

import {
  Clock,
  Intersection,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  WebGLRenderer,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import Game from "./app/game";
import Button from "./app/view/button";

let scene: Scene;
let camera: PerspectiveCamera;
let renderer: WebGLRenderer;

let game: Game;

let controls: OrbitControls;
let pointer: Vector2;
let raycaster: Raycaster;
const MOUSE_DELTA: number = 5;
let startX: number;
let startY: number;

let clock: Clock;
let delta: number;

function onResize() {
  let width: number = window.innerWidth;
  let height: number = window.innerHeight;
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function onMouseDown(event: MouseEvent) {
  startX = event.pageX;
  startY = event.pageY;
}

function onMouseUp(event: MouseEvent) {
  const diffX = Math.abs(event.pageX - startX);
  const diffY = Math.abs(event.pageY - startY);

  if (diffX < MOUSE_DELTA && diffY < MOUSE_DELTA) {
    onValidClick();
  }
}

function onPointerMove(event: MouseEvent) {
  // calculate pointer position in normalized device coordinates
  // (-1 to +1) for both model
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

//-----------------------------------------------------------------------------
function init() {
  scene = new Scene();
  const canvas = document.querySelector("canvas#webgl");
  renderer = new WebGLRenderer({
    canvas: canvas as HTMLElement,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x87ceeb, 1);

  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.setZ(5);
  camera.position.setX(5);
  camera.position.setY(5);

  clock = new Clock();
  game = new Game(scene);

  pointer = new Vector2();

  raycaster = new Raycaster();

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(2, 0, 2);
  controls.maxPolarAngle = Math.PI / 2;

  window.addEventListener("resize", onResize);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
}

//-----------------------------------------------------------------------------

function interceptPiece(): Button | undefined {
  raycaster.setFromCamera(pointer, camera);
  const selectable: Mesh[] = game.getSelectablePieces().map((s) => s.mesh);
  if (selectable.length == 0) return;
  const intersects: Intersection[] = raycaster.intersectObjects(selectable);
  const distance: number = Math.min(...intersects.map(({ distance }) => distance));
  const closest: Intersection = intersects.filter((intersection) => intersection.distance == distance)[0];
  return closest?.object.parent as unknown as Button;
}

function hover() {
  let button = interceptPiece();
  if (button == undefined) return;
  button.hover();
}

function onValidClick() {
  let button = interceptPiece();
  if (button == undefined) return;
  button.click();
  game.onClick(button);
}

//-----------------------------------------------------------------------------
function update(delta: number) {
  controls.update();
  game.update(delta);
  hover();
}

function render() {
  renderer.render(scene, camera);
}

function animate() {
  requestAnimationFrame(animate);
  delta = Math.min(clock.getDelta(), 0.1);
  update(delta);
  render();
}

function main() {
  init();
  animate();
}

main();

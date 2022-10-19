import "./style.css";

import GameScene from "./game/game";

import {
  PerspectiveCamera,
  WebGLRenderer,
  Vector2,
  Raycaster,
  Intersection,
  ACESFilmicToneMapping,
  Mesh,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import Stats from 'three/examples/jsm/libs/stats.module';

import { GUI } from 'dat.gui'

import {Selectable} from "./game/game/selectable";

let camera: PerspectiveCamera;
let renderer: WebGLRenderer;

let controls: OrbitControls;

let pointer: Vector2;
let raycaster: Raycaster;

let stats: Stats;

let button = { restart: function(){ init() }};
const gui: GUI = new GUI;
gui.add(button,'restart');

let game: GameScene;

//-----------------------------------------------------------------------------
function onResize() {
  let width: number = window.innerWidth;
  let height: number = window.innerHeight;

  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = width / height;

  camera.updateProjectionMatrix();
}

function onClick() { game.onClick(); }

function onPointerMove(event: MouseEvent) {
  // calculate pointer position in normalized device coordinates
  // (-1 to +1) for both game
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}


//-----------------------------------------------------------------------------
function init(){
  game = new GameScene();
  camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.setZ(5);
  camera.position.setX(5);
  camera.position.setY(5);

  const canvas = document.querySelector("canvas#webgl");
  renderer = new WebGLRenderer({
    canvas: canvas as HTMLElement,
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = ACESFilmicToneMapping;
  //renderer.outputEncoding = sRGBEncoding;
  renderer.setClearColor(0x87CEEB, 1);

  pointer = new Vector2();

  raycaster = new Raycaster();

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(2, 0, 2);
  controls.maxPolarAngle = Math.PI / 2;

  stats = Stats();
  document.body.appendChild(stats.dom);

  window.addEventListener("resize", onResize);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("click", onClick);
}


//-----------------------------------------------------------------------------
function hover(): Selectable {
  //TODO Stop Pieces from knowing their positions
  //TODO getSelectablePieces should return dict<Piece, Position>
  raycaster.setFromCamera(pointer, camera);

  const selectable: Mesh[] = game.getSelectablePieces().map(s => s.mesh);
  const intersects: Intersection[] = raycaster.intersectObjects(selectable);
  const distance: number = Math.min(...intersects.map( ({distance}) => distance));
  const closest: Intersection = intersects.filter(intersection => intersection.distance == distance)[0];
  const hovered: Selectable | undefined = closest?.object.parent as unknown as Selectable;
  game.hover(hovered);
  return hovered;
}

//-----------------------------------------------------------------------------
function clear() { game.resetPiece(); }

function update() {
  controls.update();
  hover();
  game.update();
  stats.update();
}

function render() {
  renderer.render(game, camera);
}

//-----------------------------------------------------------------------------
function animate() {
  clear();
  update();
  render();
  requestAnimationFrame(animate);
}

//-----------------------------------------------------------------------------
function main() {
  init();
  animate();
}

//-----------------------------------------------------------------------------
main();

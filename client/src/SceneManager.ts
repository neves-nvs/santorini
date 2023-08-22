import {
    AmbientLight,
    Clock, 
    DirectionalLight, 
    Intersection, 
    Mesh, 
    PerspectiveCamera, 
    Raycaster, 
    Scene, 
    Vector2, WebGLRenderer
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Game from "./scene/game";
import Button from "./scene/button";

const MOUSE_DELTA: number = 5;

export class SceneManager {
    private scene: Scene;
    private renderer: WebGLRenderer;
    private camera: PerspectiveCamera;

    private controls: OrbitControls;
    private pointer: Vector2;
    private raycaster: Raycaster;
    private startX: number = 0;
    private startY: number = 0;

    private game: Game;
    private clock: Clock;
    private delta: number;

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
            1000
        );
        this.camera.position.setZ(5);
        this.camera.position.setX(5);
        this.camera.position.setY(5);

        let ambientLight = new AmbientLight(0x404040);
        this.scene.add(ambientLight);
        let directionalLight = new DirectionalLight(0xffffff, 0.5);
        this.scene.add(directionalLight);

        this.clock = new Clock();

        this.pointer = new Vector2();
        this.raycaster = new Raycaster();

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(2, 0, 2);
        this.controls.maxPolarAngle = Math.PI / 2;

        this.delta = Math.min(this.clock.getDelta(), 0.1);

        this.game = new Game(this.scene);

        window.addEventListener("resize", this.onWindowResize.bind(this));
        window.addEventListener("mousedown", this.onMouseDown.bind(this));
        window.addEventListener("mouseup", this.onMouseUp.bind(this));
        window.addEventListener("mousemove", this.onMouseMove.bind(this));
    }

    public update() {
        this.controls.update();

        this.delta = Math.min(this.clock.getDelta(), 0.1);
        this.game.update(this.delta);

        this.hoverButton();

        this.renderer.render(this.scene, this.camera)
    }

    public onWindowResize() {
        let width: number = window.innerWidth;
        let height: number = window.innerHeight;

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }


    public onMouseDown(event: MouseEvent) {
        this.startX = event.pageX;
        this.startY = event.pageY;
    }

    public onMouseUp(event: MouseEvent) {
        const diffX = Math.abs(event.pageX - this.startX);
        const diffY = Math.abs(event.pageY - this.startY);

        if (diffX < MOUSE_DELTA && diffY < MOUSE_DELTA) {
            this.clickButton();
        }
    }

    public onMouseMove(event: MouseEvent) {
        // calculate pointer position in normalized device coordinates
        // (-1 to +1) for both model
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    private hoverButton() {
        this.interceptButton()?.hover();
    }

    private clickButton() {
        let button = this.interceptButton();
        if (button == undefined) return;
        //game.onClick(button);
    }

    private interceptButton(): Button | undefined {
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const selectable: Mesh[] = this.game.getSelectableButtons().map((s) => s.mesh);
        if (selectable.length == 0) return;
        const intersects: Intersection[] = this.raycaster.intersectObjects(selectable);
        const distance: number = Math.min(...intersects.map(({ distance }) => distance));
        const closest: Intersection = intersects.filter((intersection) => intersection.distance == distance)[0];
        return closest?.object.parent as unknown as Button;
    }
}
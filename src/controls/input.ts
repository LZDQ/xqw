import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

const bounds = { x: 6.5, z: 4.5 };

export class InputController {
  private camera: THREE.PerspectiveCamera;
  private controls: PointerLockControls;
  private keys: Set<string>;
  private walkSpeed = 3.5;
  private readonly onKeyDown: (e: KeyboardEvent) => void;
  private readonly onKeyUp: (e: KeyboardEvent) => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement){
    this.camera = camera;
    this.controls = new PointerLockControls(camera, domElement);
    this.keys = new Set<string>();

    this.onKeyDown = (e: KeyboardEvent) => this.keys.add(e.code);
    this.onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  lock(): void{
    this.controls.lock();
  }

  isLocked(): boolean{
    return this.controls.isLocked;
  }

  dispose(): void{
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.controls.unlock();
  }

  update(delta: number): void{
    if(!this.controls.isLocked) return;
    const direction = new THREE.Vector3();
    const forward = (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0);
    const strafe = (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0);
    direction.set(strafe, 0, forward).normalize();
    if(direction.lengthSq() > 0){
      const move = direction.multiplyScalar(this.walkSpeed * delta);
      this.controls.moveRight(move.x);
      this.controls.moveForward(move.z);
      this.clampPosition();
    }
  }

  private clampPosition(): void{
    const pos = this.camera.position;
    pos.x = Math.max(-bounds.x, Math.min(bounds.x, pos.x));
    pos.z = Math.max(-bounds.z, Math.min(bounds.z, pos.z));
    pos.y = 1.6; // keep eye height stable
  }
}

import { ROOM, type Collider } from "src/scene/classroom";
import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

const bounds = { x: ROOM.width / 2 - 0.5, z: ROOM.depth / 2 - 0.5 };

export class InputController {
  private camera: THREE.PerspectiveCamera;
  private controls: PointerLockControls;
  private keys: Set<string>;
  private walkSpeed = 4.5;
  private sensitivity = 1.0;
  private readonly playerRadius = 0.45;
  private readonly eyeHeight = 1.6;
  private readonly colliders: Collider[];
  private readonly onKeyDown: (e: KeyboardEvent) => void;
  private readonly onKeyUp: (e: KeyboardEvent) => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, colliders: Collider[] = []){
    this.camera = camera;
    this.controls = new PointerLockControls(camera, domElement);
    this.keys = new Set<string>();
    this.colliders = colliders;
    this.setSensitivity(this.sensitivity);

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

  unlock(): void{
    this.controls.unlock();
  }

  dispose(): void{
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.controls.unlock();
  }

  update(delta: number): void{
    if(!this.controls.isLocked) return;
    const direction = new THREE.Vector3();
    const pos = this.camera.position;
    const prevX = pos.x;
    const prevZ = pos.z;
    const forward = (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0);
    const strafe = (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0);
    direction.set(strafe, 0, forward);
    if(direction.lengthSq() > 0){
      direction.normalize();
      const move = direction.multiplyScalar(this.walkSpeed * delta);
      this.controls.moveRight(move.x);
      this.controls.moveForward(move.z);
    }
    this.keepInsideRoom();
    this.resolveCollisions(prevX, prevZ);
    pos.y = this.eyeHeight; // keep eye height stable
  }

  private keepInsideRoom(): void{
    const pos = this.camera.position;
    const maxX = bounds.x - this.playerRadius;
    const maxZ = bounds.z - this.playerRadius;
    pos.x = Math.max(-maxX, Math.min(maxX, pos.x));
    pos.z = Math.max(-maxZ, Math.min(maxZ, pos.z));
  }

  private resolveCollisions(prevX: number, prevZ: number): void{
    const pos = this.camera.position;
    const minDistSq = this.playerRadius * this.playerRadius;
    for (const collider of this.colliders) {
      const dx = pos.x - collider.x;
      const dz = pos.z - collider.z;
      const clampedX = Math.max(-collider.halfSizeX, Math.min(collider.halfSizeX, dx));
      const clampedZ = Math.max(-collider.halfSizeZ, Math.min(collider.halfSizeZ, dz));
      const closestX = collider.x + clampedX;
      const closestZ = collider.z + clampedZ;
      const offsetX = pos.x - closestX;
      const offsetZ = pos.z - closestZ;
      const distSq = offsetX * offsetX + offsetZ * offsetZ;
      if (distSq < minDistSq) {
        if (distSq === 0) {
          const moveX = pos.x - prevX;
          const moveZ = pos.z - prevZ;
          if (Math.abs(moveX) > Math.abs(moveZ)) {
            const dir = Math.sign(moveX || dx || 1);
            pos.x = collider.x + (collider.halfSizeX + this.playerRadius) * dir;
          } else {
            const dir = Math.sign(moveZ || dz || 1);
            pos.z = collider.z + (collider.halfSizeZ + this.playerRadius) * dir;
          }
        } else {
          const dist = Math.sqrt(distSq);
          const push = (this.playerRadius - dist) / dist;
          pos.x += offsetX * push;
          pos.z += offsetZ * push;
        }
        this.keepInsideRoom();
      }
    }
  }

  setSensitivity(multiplier: number): void{
    const clamped = Math.max(0.2, Math.min(5, multiplier));
    this.sensitivity = clamped;
    // three.js PointerLockControls exposes pointerSpeed for mouse look
    (this.controls as unknown as { pointerSpeed?: number }).pointerSpeed = clamped;
  }

  getSensitivity(): number{
    return this.sensitivity;
  }
}

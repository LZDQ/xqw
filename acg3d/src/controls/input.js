import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

const bounds = { x: 6.5, z: 4.5 };

export class InputController {
  constructor(camera, domElement){
    this.camera = camera;
    this.controls = new PointerLockControls(camera, domElement);
    this.keys = new Set();
    this.velocity = new THREE.Vector3();
    this.walkSpeed = 3.5;

    this._onKeyDown = (e) => this.keys.add(e.code);
    this._onKeyUp = (e) => this.keys.delete(e.code);

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  }

  lock(){ this.controls.lock(); }
  isLocked(){ return this.controls.isLocked; }

  dispose(){
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    this.controls.unlock();
  }

  update(delta){
    if(!this.controls.isLocked) return;
    const direction = new THREE.Vector3();
    const forward = (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0);
    const strafe = (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0);
    direction.set(strafe, 0, forward).normalize();
    if(direction.lengthSq() > 0){
      const move = direction.multiplyScalar(this.walkSpeed * delta);
      this.controls.moveRight(move.x);
      this.controls.moveForward(move.z);
      this._clampPosition();
    }
  }

  _clampPosition(){
    const pos = this.camera.position;
    pos.x = Math.max(-bounds.x, Math.min(bounds.x, pos.x));
    pos.z = Math.max(-bounds.z, Math.min(bounds.z, pos.z));
    pos.y = 1.6; // keep eye height stable
  }
}

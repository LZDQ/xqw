import * as THREE from "three";
import { InputController } from "./controls/input.ts";
import { initClassroom } from "./scene/classroom.ts";

const app = document.getElementById("app");
if(!app){
  throw new Error("Missing #app container");
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 50);
camera.position.set(0, 1.6, 4);

const { scene, ready } = initClassroom(THREE);
scene.add(camera);

const clock = new THREE.Clock();
const input = new InputController(camera, renderer.domElement);

window.addEventListener("resize", onResize);
window.addEventListener("click", onClick);

onResize();
ready.catch(err => console.error("[acg3d] asset load error", err)).finally(animate);

function onResize(): void{
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onClick(): void{
  if(!input.isLocked()){
    input.lock();
  }
}

function animate(): void{
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  input.update(delta);
  renderer.render(scene, camera);
}

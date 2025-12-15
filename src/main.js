import * as THREE from "three";
import { initClassroom, updatePlayerMeshes } from "./scene/classroom.js";
import { GameState } from "./core/state.js";
import { loadState, saveState, clearState } from "./core/storage.js";
import { createHUD } from "./ui/hud.js";
import { createWhiteboard } from "./ui/whiteboard.js";
import { InputController } from "./controls/input.js";
import { pressButton } from "./systems/animation.js";

const app = document.getElementById("app");
console.log("[acg3d] init app", app);

// Renderer and camera
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);
console.log("[acg3d] renderer attached", renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 50);
camera.position.set(0, 1.6, 4);
console.log("[acg3d] camera", camera.position);

// Scene setup
const { scene, players: playerMeshes, buttons, ready } = initClassroom(THREE);
scene.add(camera);
console.log("[acg3d] scene objects", scene.children.length);

// State and UI
const saved = loadState();
const state = new GameState(saved || {});
const clock = new THREE.Clock();
let selectedId = state.players[0]?.id || null;
const hud = createHUD(state, {
  onLock: () => input.lock(),
  onSave: () => { saveState(state); showToast("已保存进度"); },
  onReset: () => { clearState(); showToast("周数已重置"); renderPlayers(); }
});
app.appendChild(hud.element);

const whiteboard = createWhiteboard(state);
app.appendChild(whiteboard.element);
app.appendChild(makeCrosshair());

// Input
const input = new InputController(camera, renderer.domElement);

// Raycaster for button clicks
const raycaster = new THREE.Raycaster();

window.addEventListener("resize", onResize);
window.addEventListener("click", onClick);

state.on("playerChanged", renderPlayers);
state.on("weekChanged", () => { renderPlayers(); saveState(state); });
state.on("action", () => { renderPlayers(); saveState(state); showToast("已执行操作，周数+1"); });

function renderPlayers(){
  updatePlayerMeshes(THREE, playerMeshes, state.players, selectedId);
  whiteboard.render();
  hud.render();
  hud.setSelected(getSelectedName());
}

function onResize(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  console.log("[acg3d] resize", window.innerWidth, window.innerHeight);
}

function onClick(){
  if(!input.isLocked()){
    input.lock();
    return;
  }
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersectsButtons = raycaster.intersectObjects(buttons, true);
  if(intersectsButtons.length > 0){
    const hit = intersectsButtons[0].object;
    const action = hit.userData.action;
    if(action){
      pressButton(hit);
      state.applyAction(action, selectedId || state.players[0]?.id);
    }
    return;
  }
  const intersectsPlayers = raycaster.intersectObjects(playerMeshes, true);
  if(intersectsPlayers.length > 0){
    const hit = intersectsPlayers[0].object;
    if(hit.userData.playerId){
      selectedId = hit.userData.playerId;
      renderPlayers();
      showToast(`已选择 ${getSelectedName()}`);
    }
  }
}

function getSelectedName(){
  return state.players.find(p => p.id === selectedId)?.name || "未选";
}

function animate(){
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  input.update(delta);
  renderer.render(scene, camera);
  // Uncomment if you suspect animate not running:
  // console.log("[acg3d] frame", delta);
}
renderPlayers();
if(ready && typeof ready.then === "function"){
  ready.then(() => renderPlayers());
}
animate();

function makeCrosshair(){
  const cross = document.createElement("div");
  cross.id = "crosshair";
  return cross;
}

let toastTimer;
function showToast(msg){
  let toast = document.querySelector(".toast");
  if(!toast){
    toast = document.createElement("div");
    toast.className = "toast";
    app.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1400);
}

import * as THREE from "three";
import { InputController } from "./controls/input.ts";
import { getActiveGameState } from "./core/session.ts";
import { initSettingsHUD, isSettingsOpen } from "./ui/settings.ts";
import { showStartHUD } from "./ui/start.ts";
import { initClassroom } from "./scene/classroom.ts";

async function bootstrap(): Promise<void> {
  const app = document.getElementById("app");
  if (!app) {
    throw new Error("Missing #app container");
  }

  await showStartHUD(app);
  startScene(app);
}

function startScene(app: HTMLElement): void {
  const gameState = getActiveGameState();
  if (!gameState) {
    console.warn("[acg3d] starting scene without active game state");
  } else {
    console.info("[acg3d] game initialized", {
      difficulty: gameState.difficulty,
      provinceId: gameState.provinceId,
      students: gameState.initialStudents
    });
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  app.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 50);
  camera.position.set(0, 1.6, 4);

  const { scene, ready } = initClassroom(THREE, gameState?.students ?? []);
  if (gameState) {
    gameState.scene = scene;
  }
  scene.add(camera);

  const clock = new THREE.Clock();
  const input = new InputController(camera, renderer.domElement);
  initSettingsHUD(app, input);

  function onResize(): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onClick(): void {
    if (isSettingsOpen()) return;
    if (!input.isLocked()) {
      input.lock();
    }
  }

  window.addEventListener("resize", onResize);
  window.addEventListener("click", onClick);

  onResize();
  ready.catch((err) => console.error("[acg3d] asset load error", err)).finally(animate);

  function animate(): void {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    input.update(delta);
    renderer.render(scene, camera);
  }
}

bootstrap().catch((err) => {
  console.error("[acg3d] failed to start", err);
});

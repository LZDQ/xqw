import * as THREE from "three";
import { InputController } from "./controls/input.ts";
import type { GameState } from "./core/GameState.ts";
import { initDebugHUD } from "./ui/debugHud.ts";
import { initSettingsHUD, isSettingsOpen } from "./ui/settings.ts";
import { showStartHUD } from "./ui/start.ts";
import { initClassroom } from "./scene/classroom.ts";
import { renderNormalLayout } from "./ui/whiteboard/normalLayout.ts";
import type { WhiteboardDisplay } from "./scene/whiteboardDisplay.ts";

async function bootstrap(): Promise<void> {
  const app = document.getElementById("app");
  if (!app) {
    throw new Error("Missing #app container");
  }

  const gameState = await showStartHUD(app);
  startScene(app, gameState);
}

function startScene(app: HTMLElement, gameState: GameState): void {
  console.info("[acg3d] game initialized", {
    difficulty: gameState.difficulty,
    provinceId: gameState.provinceId,
    students: gameState.initialStudents
  });

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  app.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 50);
  camera.position.set(0, 1.6, 4);

  const { scene, ready } = initClassroom(THREE, gameState.students);
  gameState.scene = scene;
  scene.add(camera);

  const clock = new THREE.Clock();
  const input = new InputController(camera, renderer.domElement);
  initSettingsHUD(app, input);
  const debugHud = initDebugHUD(app, camera);

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
  ready
    .then(() => {
      const whiteboardDisplay = scene.userData.whiteboardDisplay as WhiteboardDisplay | undefined;
      if (!whiteboardDisplay) return;
      // Normal layout (meta left, operations right). Other events can swap layouts later.
      renderNormalLayout(whiteboardDisplay, gameState);
    })
    .catch((err) => console.error("[acg3d] asset load error", err))
    .finally(animate);

  function animate(): void {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    input.update(delta);
    debugHud.update();
    renderer.render(scene, camera);
  }
}

bootstrap().catch((err) => {
  console.error("[acg3d] failed to start", err);
});

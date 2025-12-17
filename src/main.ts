import * as THREE from "three";
import { InputController } from "./controls/input.ts";
import type { GameState } from "./core/GameState.ts";
import { initDebugHUD } from "./ui/debugHud.ts";
import { initSettingsHUD, isSettingsOpen } from "./ui/settings.ts";
import { showStartHUD } from "./ui/start.ts";
import { initClassroom } from "./scene/classroom.ts";
import { createNormalActionButtons, renderNormalLayout } from "./ui/whiteboard/normalLayout.ts";
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
  const raycaster = new THREE.Raycaster();
  const ndcCenter = new THREE.Vector2(0, 0);
  let currentHit: { kind: "student" | "button"; label: string; target: THREE.Object3D } | null = null;

  function onResize(): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onClick(): void {
    if (isSettingsOpen()) return;
    if (!input.isLocked()) {
      input.lock();
      return;
    }
    if (!currentHit) return;
    if (currentHit.kind === "button") {
      console.info("[acg3d] button clicked", currentHit.label);
      pressButton(currentHit.target);
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
      const existing = scene.userData.whiteboardButtons as Array<{ root: THREE.Object3D }> | undefined;
      existing?.forEach((b) => b.root.removeFromParent());
      scene.userData.whiteboardButtons = createNormalActionButtons(THREE, whiteboardDisplay);
    })
    .catch((err) => console.error("[acg3d] asset load error", err))
    .finally(animate);

  function animate(): void {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    input.update(delta);
    currentHit = pickTarget(raycaster, ndcCenter, camera, scene);
    debugHud.setTarget(currentHit?.label ?? "-");
    debugHud.update();
    renderer.render(scene, camera);
  }
}

function pickTarget(
  raycaster: THREE.Raycaster,
  ndc: THREE.Vector2,
  camera: THREE.Camera,
  scene: THREE.Scene
): { kind: "student" | "button"; label: string; target: THREE.Object3D } | null {
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  for (const hit of hits) {
    const info = describePick(hit.object);
    if (info) return info;
  }
  return null;
}

function describePick(obj: THREE.Object3D): { kind: "student" | "button"; label: string; target: THREE.Object3D } | null {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    const kind = cur.userData.kind as string | undefined;
    if (kind === "button") {
      const root = findButtonRoot(cur);
      const title =
        (root.userData.actionTitle as string | undefined) ??
        (root.userData.actionId as string | undefined) ??
        "Unknown";
      return { kind: "button", label: `Button ${title}`, target: root };
    }
    const studentName = cur.userData.studentName as string | undefined;
    if (studentName) {
      return { kind: "student", label: `Student ${studentName}`, target: cur };
    }
    cur = cur.parent;
  }
  return null;
}

function pressButton(target: THREE.Object3D): void {
  const root = findButtonRoot(target);
  if (!root) return;

  const pressDepth = 0.05;
  const pressDurationMs = 120;
  const releaseDurationMs = 160;

  const startZ = root.position.z;
  const downZ = startZ - pressDepth;

  const animate = (from: number, to: number, duration: number, done?: () => void): void => {
    const start = performance.now();
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      root!.position.z = from + (to - from) * eased;
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        done?.();
      }
    };
    requestAnimationFrame(tick);
  };

  animate(startZ, downZ, pressDurationMs, () => animate(downZ, startZ, releaseDurationMs));
}

function findButtonRoot(from: THREE.Object3D): THREE.Object3D | null {
  // Prefer sinking the whole button group (so thickness + edges move together).
  let cur: THREE.Object3D | null = from;
  let best: THREE.Object3D | null = null;
  while (cur) {
    if (cur.userData.kind === "button") {
      best = cur;
    }
    cur = cur.parent;
  }
  return best;
}

bootstrap().catch((err) => {
  console.error("[acg3d] failed to start", err);
});

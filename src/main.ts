import * as THREE from "three";
import { InputController } from "./controls/input.ts";
import type { GameState } from "./core/GameState.ts";
import { initDebugHUD } from "./ui/debugHud.ts";
import { initSettingsHUD, isSettingsOpen } from "./ui/settings.ts";
import { consumeRenderRequest, getWhiteboardView, type WhiteboardView } from "./ui/whiteboard.tsx";
import { showStartHUD } from "./ui/start.ts";
import { showEndOverlay } from "./ui/end.ts";
import { initClassroom, prefetchClassroomAssets, updatePressureEmitters, updateStudentPressureTint } from "./scene/classroom.ts";
import { CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { StudentLabel } from "./scene/studentLabel.ts";
import {
	computeBoundsTree, disposeBoundsTree, acceleratedRaycast,
} from 'three-mesh-bvh';

// three-mesh-bvh patch
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

async function bootstrap(): Promise<void> {
  const app = document.getElementById("app");
  if (!app) {
    throw new Error("Missing #app container");
  }

  prefetchClassroomAssets(THREE).catch((err) => console.warn("prefetch failed", err));

  const gameState = await showStartHUD(app);
  startScene(app, gameState);
}

function startScene(app: HTMLElement, gameState: GameState): void {
  console.info("game initialized");

  const cssRenderer = new CSS3DRenderer();
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.domElement.style.position = "absolute";
  cssRenderer.domElement.style.top = "0";
  cssRenderer.domElement.style.left = "0";
  cssRenderer.domElement.style.pointerEvents = "none";
  cssRenderer.domElement.style.zIndex = "1";
  app.appendChild(cssRenderer.domElement);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.top = "0";
  renderer.domElement.style.left = "0";
  renderer.domElement.style.zIndex = "0";
  app.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 50);
  camera.position.set(0, 1.6, 4);

  const pickTargets: THREE.Object3D[] = [];
  ensureCrosshair(app);

  const {
    scene,
    cssScene,
    ready,
    whiteboard,
    airConditioner,
    colliders,
  } = initClassroom(THREE, gameState);
  const studentLabel = new StudentLabel(THREE, cssScene, camera, gameState);
  gameState.scene = scene;
  const playerMeshes = (scene.userData.playerMeshes as THREE.Object3D[]) ?? [];
  scene.add(camera);
  pickTargets.push(whiteboard.mesh);

  const clock = new THREE.Clock();
  const input = new InputController(camera, renderer.domElement, colliders);
  const exitGame = (): void => {
    gameState.gameEnded = true;
    gameState.gameEndReason = "辞职";
    gameState.seasonEndTriggered = true;
  };
  initSettingsHUD(app, input, camera, exitGame);
  const debugHud = initDebugHUD(app, camera);
  const raycaster = new THREE.Raycaster();
  const ndcCenter = new THREE.Vector2(0, 0);
  let currentHit: {
    kind: "student" | "whiteboard";
    label: string;
    target: THREE.Object3D;
    uv?: THREE.Vector2 | null;
    screen?: THREE.Vector2 | null;
  } | null = null;

  function onResize(): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onClick(event?: MouseEvent): void {
    if ((event as any)?._whiteboardSynthetic) return;
    if (isSettingsOpen()) return;
    if (gameState.gameEnded) {
      input.unlock();
      return;
    }
    if (!input.isLocked()) {
      input.lock();
      return;
    }
    if (!currentHit) return;
    if (currentHit.kind === "whiteboard") {
      if (whiteboard) {
        whiteboard.simulateClick({
            uv: currentHit.uv ?? new THREE.Vector2(0.5, 0.5),
            screen: currentHit.screen ?? null,
        });
      }
      return;
    }
  }

  window.addEventListener("resize", onResize);
  window.addEventListener("click", onClick);

  onResize();

  let previousWhiteboardView: WhiteboardView | null = null;
  let endOverlayShown = false;
  function animate(): void {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    input.update(delta);
    airConditioner.update(delta);
    currentHit = pickTargets.length > 0 ? pickTarget(raycaster, ndcCenter, camera, pickTargets) : null;
    const studentHit = currentHit && currentHit.kind === "student" ? { target: currentHit.target } : null;
    studentLabel.setTarget(studentHit);
    studentLabel.tick();
    updatePressureEmitters(THREE, playerMeshes, delta);
    updateStudentPressureTint(THREE, playerMeshes);
    if (!endOverlayShown && gameState.gameEnded) {
      endOverlayShown = true;
      input.unlock();
      showEndOverlay(app, gameState);
    }
    if (getWhiteboardView() !== previousWhiteboardView || consumeRenderRequest()) {
      whiteboard.render(gameState);
      previousWhiteboardView = getWhiteboardView();
    }
    debugHud.setTarget(currentHit?.label ?? "-");
    debugHud.update();
    renderer.render(scene, camera);
    cssRenderer.render(cssScene, camera);
  }

  ready
    .then(() => {
      pickTargets.push(
        ...scene.userData.playerMeshes as THREE.Object3D[],
      );
      whiteboard.render(gameState);
    })
    .catch((err) => console.error("asset load error", err))
    .finally(animate);
}

function pickTarget(
  raycaster: THREE.Raycaster,
  ndc: THREE.Vector2,
  camera: THREE.Camera,
  targets: THREE.Object3D[]
): {
  kind: "student" | "whiteboard";
  label: string;
  target: THREE.Object3D;
  uv?: THREE.Vector2 | null;
  screen?: THREE.Vector2 | null;
} | null {
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(targets, true);
  for (const hit of hits) {
    const info = describePick(hit.object);
    if (info) {
      if (info.kind === "whiteboard") {
        const ndcPoint = hit.point.clone().project(camera);
        const screen = new THREE.Vector2(
          (ndcPoint.x + 1) * 0.5 * window.innerWidth,
          (1 - ndcPoint.y) * 0.5 * window.innerHeight
        );
        return { ...info, target: hit.object, uv: hit.uv?.clone() ?? null, screen };
      }
      return info;
    }
  }
  return null;
}

function describePick(obj: THREE.Object3D): { kind: "student" | "whiteboard"; label: string; target: THREE.Object3D } | null {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur.userData.whiteboard) {
      return { kind: "whiteboard", label: "Whiteboard", target: cur };
    }
    const studentName = cur.userData.studentName as string | undefined;
    if (studentName) {
      return { kind: "student", label: `Student ${studentName}`, target: cur };
    }
    cur = cur.parent;
  }
  return null;
}

bootstrap().catch((err) => {
  console.error("failed to start", err);
});

function ensureCrosshair(parent: HTMLElement): void {
  if (document.getElementById("crosshair")) return;
  const crosshair = document.createElement("div");
  crosshair.id = "crosshair";
  parent.appendChild(crosshair);
}

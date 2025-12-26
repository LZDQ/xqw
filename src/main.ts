import * as THREE from "three";
import { InputController } from "./controls/input.ts";
import type { GameState } from "./core/GameState.ts";
import { initDebugHUD } from "./ui/debugHud.ts";
import { initSettingsHUD, isSettingsOpen } from "./ui/settings.ts";
import { showStartHUD } from "./ui/start.ts";
import { initClassroom } from "./scene/classroom.ts";
import { CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";
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

  const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 50);
  camera.position.set(0, 1.6, 4);

  const pickTargets: THREE.Object3D[] = [];
  ensureCrosshair(app);

  const {
    scene,
    cssScene,
    ready,
    whiteboard,
  } = initClassroom(THREE, gameState);
  gameState.scene = scene;
  scene.add(camera);
  pickTargets.push(whiteboard.mesh);

  const clock = new THREE.Clock();
  const input = new InputController(camera, renderer.domElement);
  initSettingsHUD(app, input);
  const debugHud = initDebugHUD(app, camera);
  const raycaster = new THREE.Raycaster();
  const ndcCenter = new THREE.Vector2(0, 0);
  let currentHit: { kind: "student" | "whiteboard"; label: string; target: THREE.Object3D; uv?: THREE.Vector2 | null } | null = null;

  function onResize(): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onClick(event?: MouseEvent): void {
    if ((event as any)?._whiteboardSynthetic) return;
    if (isSettingsOpen()) return;
    if (!input.isLocked()) {
      input.lock();
      return;
    }
    if (!currentHit) return;
    if (currentHit.kind === "whiteboard") {
      if (whiteboard) {
        whiteboard.simulateClick(currentHit.uv ?? new THREE.Vector2(0.5, 0.5));
      }
      return;
    }
  }

  window.addEventListener("resize", onResize);
  window.addEventListener("click", onClick);

  onResize();

  let animateCount = 0;
  function animate(): void {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    animateCount++;
    input.update(delta);
    currentHit = pickTargets.length > 0 ? pickTarget(raycaster, ndcCenter, camera, pickTargets) : null;
    debugHud.setTarget(currentHit?.label ?? "-");
    debugHud.update(animateCount);
    renderer.render(scene, camera);
    cssRenderer.render(cssScene, camera);
  }

  ready
    .then(() => {
      pickTargets.push(
        ...scene.userData.playerMeshes as THREE.Object3D[],
      );
      whiteboard.syncGameState(gameState);
    })
    .catch((err) => console.error("asset load error", err))
    .finally(animate);
}

function pickTarget(
  raycaster: THREE.Raycaster,
  ndc: THREE.Vector2,
  camera: THREE.Camera,
  targets: THREE.Object3D[]
): { kind: "student" | "whiteboard"; label: string; target: THREE.Object3D; uv?: THREE.Vector2 | null } | null {
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(targets, true);
  for (const hit of hits) {
    const info = describePick(hit.object);
    if (info) {
      if (info.kind === "whiteboard") {
        return { ...info, target: hit.object, uv: hit.uv?.clone() ?? null };
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

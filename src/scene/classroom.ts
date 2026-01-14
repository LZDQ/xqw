import type * as THREEType from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { GameState } from "../core/GameState.ts";
import type { Student } from "../core/Student.ts";
import { Whiteboard } from "./Whiteboard.ts";
import { AirConditioner } from "../objects/AirConditioner.ts";
import { PRESSURE_THRESHOLD_HIGH, PRESSURE_THRESHOLD_MID } from "../lib/constants.ts";

export const ROOM = { width: 14, depth: 20, height: 7.875 }; // height * 1.75
export const BOARD_SIZE = { width: 11.2, height: 6.0 };
// Use root-relative paths so dev server/static builds serve public assets correctly.
const MODEL_BASE = "/assets/models/";
const FALLBACK_TEXTURE = "/assets/textures/WOOD 1_0.jpeg";
const FLAME_TEXTURE = "/assets/textures/Flame_(texture)_JE1_BE1.png";
type AssetKey = "desk" | "chair" | "player" | "ceiling" | "airConditioner" | "classroomWall";
const MODEL_SCALE: Record<AssetKey, number> = {
  desk: 0.4,        // doubled to restore 2x sizing
  chair: 0.01,
  player: 1.0,
  ceiling: 1.0,
  airConditioner: 1.0,
  classroomWall: 1.0,
};
const ASSETS_TO_LOAD: Array<[AssetKey, string]> = [
  ["desk", "desk.glb"],
  ["chair", "chair.glb"],
  ["player", "nairong.glb"],
  ["ceiling", "ceiling.glb"],
  ["airConditioner", "air_conditioner.glb"],
  ["classroomWall", "classroom_wall.glb"]
];
let prefetchPromise: Promise<void> | null = null;
const PRESSURE_MIX_MID = 0.40;
const PRESSURE_MIX_HIGH = 0.85;
const PRESSURE_MIX_MAX = 0.99;
const PRESSURE_EMIT_RATE_MID = 2.5;
const PRESSURE_EMIT_RATE_HIGH = 10.0;
const PRESSURE_EMIT_HEIGHT_RATIO = 0.65;    // relative portion of student height to emit around
const PRESSURE_EMIT_BASE_DROP = 0.35;       // how far below the reference point to spawn flames
const PRESSURE_EMIT_VERTICAL_JITTER = 0.08; // small up/down variance at spawn
const PRESSURE_EMIT_HORIZONTAL_JITTER = 0.28;
const PRESSURE_EMIT_HORIZONTAL_SPEED = 1.2; // lateral drift speed
const DESK_COLLIDER_HALF_SIZE = { x: 0.8, z: 0.55 };
const CHAIR_COLLIDER_HALF_SIZE = { x: 0.45, z: 0.45 };
const CHAIR_COLLIDER_OFFSET = { x: 0, z: 0.7 };
let pressureTintColor: THREEType.Color | null = null;
let pressureWorkingColor: THREEType.Color | null = null;
let flameTexture: THREEType.Texture | null = null;
const FRONT_WALL_BACK_OFFSET = 0.02; // push decorative wall slightly behind the board

interface Seat {
  seatId: number;
  x: number;
  z: number;
}

export interface Collider {
  x: number;
  z: number;
  halfSizeX: number;
  halfSizeZ: number;
}

export interface ClassroomInitResult {
  scene: THREEType.Scene;
  cssScene: THREEType.Scene;
  ready: Promise<void>;
  whiteboard: Whiteboard;
  airConditioner: AirConditioner;
  colliders: Collider[];
}

export function prefetchClassroomAssets(THREE: typeof THREEType): Promise<void> {
  if (prefetchPromise) return prefetchPromise;
  const manager = new THREE.LoadingManager();
  const loader = new GLTFLoader(manager);
  loader.setPath(MODEL_BASE);
  loader.setResourcePath(MODEL_BASE);

  const loads = ASSETS_TO_LOAD.map(([key, file]) =>
    loader.loadAsync(file).then(() => {
      console.debug(`[acg3d] prefetched ${key}`);
    }).catch((err) => {
      console.warn(`[acg3d] prefetch failed for ${file}`, err);
    })
  );
  prefetchPromise = Promise.all(loads).then(() => {});
  return prefetchPromise;
}

export function initClassroom(THREE: typeof THREEType, gameState: GameState): ClassroomInitResult {
  const scene = new THREE.Scene();
  const cssScene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f7fb);

  const floorMap = new THREE.TextureLoader().load(FALLBACK_TEXTURE);
  floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping;
  floorMap.repeat.set(ROOM.width / 2, ROOM.depth / 2);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width, ROOM.depth),
    new THREE.MeshStandardMaterial({ map: floorMap, color: 0xffffff, roughness: 0.9, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.02 });
  const walls: THREEType.Mesh[] = [];
  walls.push(makeWall(THREE, ROOM.width, ROOM.height, ROOM.depth / 2, 0, Math.PI));
  walls.push(makeWall(THREE, ROOM.width, ROOM.height, -ROOM.depth / 2, 0, 0));
  walls.push(makeWall(THREE, ROOM.depth, ROOM.height, 0, ROOM.width / 2, -Math.PI / 2));
  walls.push(makeWall(THREE, ROOM.depth, ROOM.height, 0, -ROOM.width / 2, Math.PI / 2));
  walls.forEach(w => { w.material = wallMat; scene.add(w); });

  const ceilingPlaceholder = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width, ROOM.depth),
    wallMat
  );
  ceilingPlaceholder.rotation.x = Math.PI / 2; // horizontal, facing downward
  ceilingPlaceholder.position.set(0, ROOM.height, 0);
  scene.add(ceilingPlaceholder);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(5, 6, 3);
  keyLight.castShadow = false;
  scene.add(keyLight);

  const screenLight = new THREE.PointLight(0x4a86ff, 0.4, 8);
  screenLight.position.set(0, 2.5, -ROOM.depth / 2 + 0.3);
  scene.add(screenLight);

  const playerMeshes: THREEType.Object3D[] = [];
  scene.userData.playerMeshes = playerMeshes;
  const seatLayout = buildSeatLayout();
  const colliders = buildSeatColliders(seatLayout);
  const whiteboard = new Whiteboard(BOARD_SIZE.width, BOARD_SIZE.height);
  const boardPos = new THREE.Vector3(0, 4.2, -ROOM.depth / 2 + 1e-3);
  whiteboard.addToScene(scene, cssScene, boardPos, 0);
  scene.userData.whiteboard = whiteboard;

  const airConditioner = new AirConditioner({
    scene,
    position: new THREE.Vector3(-ROOM.width / 2 + 0.25, ROOM.height - 3.5, -ROOM.depth / 2 + 5.0),
    modelUrl: `${import.meta.env.BASE_URL}/assets/models/air_conditioner.glb`,
    autoLoadModel: false,
    initialTemperature: 24,
    initiallyOn: true,
  });
  const acGroup = airConditioner.getGroup();
  acGroup.rotation.y = 0; // rotated to side wall (clockwise 90deg from previous)
  acGroup.scale.setScalar(0.4);    // user-adjusted size
  scene.userData.airConditioner = airConditioner;

  const ready = loadClassroomAssets(
    THREE,
    scene,
    seatLayout,
    playerMeshes,
    gameState.students,
    ceilingPlaceholder,
    airConditioner
  );

  return { scene, cssScene, ready, whiteboard: whiteboard, airConditioner, colliders };
}

function makeWall(
  THREE: typeof THREEType,
  width: number,
  height: number,
  z: number,
  x = 0,
  rotY = 0
): THREEType.Mesh{
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height));
  mesh.position.set(x, height / 2, z);
  mesh.rotation.y = rotY;
  return mesh;
}

function buildSeatLayout(): Seat[] {
  const rows = 4;
  const cols = 3;
  const dx = 3.5;
  const dz = 3.0;
  const startX = -(cols-1)/2*dx;
  const startZ = -(rows-1)/2*dz;
  const seats: Seat[] = [];
  let idx = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * dx;
      const z = startZ + r * dz;
      seats.push({ seatId: idx++, x, z });
    }
  }
  return seats;
}

function buildSeatColliders(seats: Seat[]): Collider[] {
  const colliders: Collider[] = [];
  seats.forEach((seat) => {
    colliders.push({
      x: seat.x,
      z: seat.z,
      halfSizeX: DESK_COLLIDER_HALF_SIZE.x,
      halfSizeZ: DESK_COLLIDER_HALF_SIZE.z,
    });
    colliders.push({
      x: seat.x + CHAIR_COLLIDER_OFFSET.x,
      z: seat.z + CHAIR_COLLIDER_OFFSET.z,
      halfSizeX: CHAIR_COLLIDER_HALF_SIZE.x,
      halfSizeZ: CHAIR_COLLIDER_HALF_SIZE.z,
    });
  });
  return colliders;
}

function loadClassroomAssets(
  THREE: typeof THREEType,
  scene: THREEType.Scene,
  seats: Seat[],
  playerMeshes: THREEType.Object3D[],
  students: Student[],
  ceilingPlaceholder?: THREEType.Object3D,
  airConditioner?: AirConditioner,
): Promise<void> {
  const manager = new THREE.LoadingManager();
  const loader = new GLTFLoader(manager);
  loader.setPath(MODEL_BASE);
  loader.setResourcePath(MODEL_BASE);

  const loadPromises = ASSETS_TO_LOAD.map(([key, file]) =>
    loader.loadAsync(file).then(gltf => ({ key, gltf })).catch(err => {
      console.error(`[acg3d] failed to load ${file}`, err);
      return null;
    })
  );

  const seatTexture = new THREE.TextureLoader(manager).load(FALLBACK_TEXTURE);
  flameTexture = new THREE.TextureLoader(manager).load(FLAME_TEXTURE);
  if (flameTexture) {
    flameTexture.colorSpace = THREE.SRGBColorSpace;
    flameTexture.wrapS = flameTexture.wrapT = THREE.ClampToEdgeWrapping;
    flameTexture.needsUpdate = true;
  }

  const assetsReady = Promise.all(loadPromises).then(results => {
    const assets: Partial<Record<AssetKey, THREEType.Object3D>> = {};
    results.forEach(entry => {
      if(!entry) return;
      const prepared = prepareAsset(THREE, entry.gltf.scene, MODEL_SCALE[entry.key]);
      assets[entry.key] = prepared;
    });
    if (assets.ceiling) {
      placeCeiling(THREE, scene, assets.ceiling, ceilingPlaceholder);
    }
    if (assets.classroomWall) {
      placeClassroomWall(THREE, scene, assets.classroomWall);
    }
    if (assets.airConditioner) {
      airConditioner?.setModel(cloneAsset(assets.airConditioner));
    }
    const studentBySeat = new Map<number, Student>();
    students.forEach((student) => {
      if (student.seatId) {
        studentBySeat.set(student.seatId, student);
      }
    });
    seats.forEach(seat => {
      const occupant = studentBySeat.get(seat.seatId);
      renderSeat(THREE, scene, seat, assets, playerMeshes, seatTexture, occupant);
    });
  });

  return Promise.all([assetsReady]).then(() => {});
}

function prepareAsset(THREE: typeof THREEType, scene: THREEType.Object3D, scale = 1): THREEType.Object3D{
  scene.traverse(child => {
    const mesh = child as THREEType.Mesh;
    if(mesh.isMesh){
      console.debug(child, mesh);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.visible = true;
      mesh.frustumCulled = false;
      if (mesh.geometry)
        mesh.geometry.computeBoundsTree();
    }
  });
  scene.scale.setScalar(scale);
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const center = box.getCenter(new THREE.Vector3());
  scene.position.x -= center.x;
  scene.position.z -= center.z;
  scene.position.y -= box.min.y;
  return scene;
}

function cloneAsset(scene: THREEType.Object3D): THREEType.Object3D{
  return cloneSkinned(scene);
}

function placeCeiling(
  THREE: typeof THREEType,
  scene: THREEType.Scene,
  ceilingAsset: THREEType.Object3D,
  placeholder?: THREEType.Object3D,
): void {
  const ceiling = cloneAsset(ceilingAsset);
  ceiling.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(ceiling);
  const size = box.getSize(new THREE.Vector3());
  const safeWidth = Math.max(size.x, 1e-3);
  const safeDepth = Math.max(size.y, 1e-3);
  const scaleX = ROOM.width / safeWidth;
  const scaleY = ROOM.depth / safeDepth;
  ceiling.scale.set(
    ceiling.scale.x * scaleX,
    ceiling.scale.y * scaleY,
    ceiling.scale.z
  );
  ceiling.rotation.x = Math.PI / 2; // horizontal, facing downward
  ceiling.position.set(0, ROOM.height, 0);
  ceiling.updateMatrixWorld(true);
  placeholder?.removeFromParent();
  scene.add(ceiling);
}

function placeClassroomWall(
  THREE: typeof THREEType,
  scene: THREEType.Scene,
  wallAsset: THREEType.Object3D,
): void {
  const base = cloneAsset(wallAsset);
  // Render from inside the room and disable frustum culling for safety.
  base.traverse((child) => {
    child.frustumCulled = false;
    const mesh = child as THREEType.Mesh;
    if (mesh?.isMesh && mesh.material) {
      const mat = mesh.material as THREEType.Material & { side?: number };
      if ("side" in mat) mat.side = THREE.DoubleSide;
    }
  });

  // Normalize baked offsets so scaling/placement use origin as reference.
  base.updateMatrixWorld(true);
  const initialBox = new THREE.Box3().setFromObject(base);
  const initialCenter = initialBox.getCenter(new THREE.Vector3());
  base.position.sub(initialCenter);
  base.updateMatrixWorld(true);

  // Align long side to room width if the model was authored along Z.
  const orientBox = new THREE.Box3().setFromObject(base);
  const orientSize = orientBox.getSize(new THREE.Vector3());
  const longAlongZ = orientSize.z > orientSize.x;
  base.rotation.y = longAlongZ ? Math.PI / 2 : 0;
  base.updateMatrixWorld(true);

  const zPos = ROOM.depth / 2 - FRONT_WALL_BACK_OFFSET;
  const xPos = ROOM.width / 2 - FRONT_WALL_BACK_OFFSET;

  const placeStrip = (
    targetWidth: number,
    targetHeight: number,
    center: THREEType.Vector3,
    direction: "x" | "z",
    segments = 4
  ) => {
    const segmentWidth = targetWidth / segments;
    for (let i = 0; i < segments; i++) {
      const inst = cloneAsset(base);
      if (direction === "z") {
        inst.rotation.y += Math.PI / 2; // rotate to span along Z for side walls
      }
      inst.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(inst);
      const size = box.getSize(new THREE.Vector3());
      const widthAxis = direction === "x" ? size.x : size.z;
      const scaleWidth = segmentWidth / Math.max(widthAxis, 1e-3);
      const scaleHeight = targetHeight / Math.max(size.y, 1e-3);
      const scaleVec = new THREE.Vector3(scaleWidth, scaleHeight, scaleWidth);
      inst.scale.multiply(scaleVec);
      inst.updateMatrixWorld(true);

      const boxScaled = new THREE.Box3().setFromObject(inst);
      const sizeScaled = boxScaled.getSize(new THREE.Vector3());
      const centerScaled = boxScaled.getCenter(new THREE.Vector3());
      inst.position.sub(centerScaled);
      inst.position.y += sizeScaled.y / 2; // bottom at y=0

      if (direction === "x") {
        const tileCenterX = center.x - targetWidth / 2 + segmentWidth / 2 + i * segmentWidth;
        inst.position.x += tileCenterX;
        inst.position.z = center.z;
      } else {
        const tileCenterZ = center.z - targetWidth / 2 + segmentWidth / 2 + i * segmentWidth;
        inst.position.z += tileCenterZ;
        inst.position.x = center.x;
      }

      inst.updateMatrixWorld(true);
      scene.add(inst);
    }
  };

  // Front and back walls (whiteboard side and opposite).
  placeStrip(ROOM.width, ROOM.height, new THREE.Vector3(0, 0, zPos), "x", 4);
  placeStrip(ROOM.width, ROOM.height, new THREE.Vector3(0, 0, -zPos), "x", 4);

  // Left and right walls.
  placeStrip(ROOM.depth, ROOM.height, new THREE.Vector3(-xPos, 0, 0), "z", 6);
  placeStrip(ROOM.depth, ROOM.height, new THREE.Vector3(xPos, 0, 0), "z", 6);
}

function renderSeat(
  THREE: typeof THREEType,
  scene: THREEType.Scene,
  seat: Seat,
  assets: Partial<Record<AssetKey, THREEType.Object3D>>,
  playerMeshes: THREEType.Object3D[],
  texture: THREEType.Texture,
  student?: Student
): void {
  const root = new THREE.Group();
  root.position.set(seat.x, 0, seat.z);
  scene.add(root);

  if(assets.desk){
    const desk = cloneAsset(assets.desk);
    desk.rotation.y = Math.PI;
    applyTextureIfMissing(desk, texture);
    root.add(desk);
  }
  if(assets.chair){
    const chair = cloneAsset(assets.chair);
    chair.position.set(0, 0, 0.7);
    chair.rotation.y = Math.PI;
    applyTextureIfMissing(chair, texture);
    root.add(chair);
  }
  if(assets.player && student){
    const player = cloneAsset(assets.player);
    player.position.set(0, 0.85, 0.80);
    player.rotation.y = Math.PI;
    tagPlayerHierarchy(player, `p${seat.seatId}`);
    tagStudentName(player, student.name);
    tagStudentRef(player, student);
    player.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(player);
    const size = box.getSize(new THREE.Vector3());
    const labelOffset = size.y + 0.15;
    player.userData.labelOffset = labelOffset;
    player.traverse(child => { child.userData.labelOffset = labelOffset; });
    attachPressureEmitter(player, size.y);
    root.add(player);
    playerMeshes.push(player);
  }
}

function tagPlayerHierarchy(root: THREEType.Object3D, playerId: string): void{
  root.userData.playerId = playerId;
  root.traverse(child => {
    child.userData.playerId = playerId;
  });
}

function tagStudentName(root: THREEType.Object3D, name: string): void {
  root.userData.studentName = name;
  root.traverse((child) => {
    child.userData.studentName = name;
  });
}

function tagStudentRef(root: THREEType.Object3D, student: Student): void {
  root.userData.studentRef = student;
  root.traverse(child => {
    child.userData.studentRef = student;
  });
}

function applyTextureIfMissing(
  object: THREEType.Object3D,
  texture: THREEType.Texture
): void {
  object.traverse((child) => {
    const mesh = child as THREEType.Mesh;
    if (mesh.isMesh) {
      const mat = mesh.material as THREEType.MeshStandardMaterial;
      const matName = (mat?.name || "").toLowerCase();
      if (mat && !mat.map && !matName.includes("shadow")) {
        mat.map = texture;
        mat.needsUpdate = true;
      }
    }
  });
}

export function updateStudentPressureTint(
  THREE: typeof THREEType,
  playerMeshes: THREEType.Object3D[],
): void {
  if (!pressureTintColor) pressureTintColor = new THREE.Color(0xdc2626);
  if (!pressureWorkingColor) pressureWorkingColor = new THREE.Color();
  playerMeshes.forEach((root) => {
    const student = root.userData?.studentRef as Student | undefined;
    if (!student) return;
    const mix = pressureToTintStrength(student.pressure);
    applyPressureTint(root, mix, pressureTintColor!, pressureWorkingColor!);
  });
}

function pressureToTintStrength(pressure: number): number {
  if (pressure < PRESSURE_THRESHOLD_MID) return 0;
  const clamped = Math.min(Math.max(pressure, 0), 100);
  if (clamped < PRESSURE_THRESHOLD_HIGH) {
    const t = (clamped - PRESSURE_THRESHOLD_MID) / (PRESSURE_THRESHOLD_HIGH - PRESSURE_THRESHOLD_MID);
    return lerp(PRESSURE_MIX_MID, PRESSURE_MIX_HIGH, t);
  }
  const t = (clamped - PRESSURE_THRESHOLD_HIGH) / (100 - PRESSURE_THRESHOLD_HIGH);
  return lerp(PRESSURE_MIX_HIGH, PRESSURE_MIX_MAX, t);
}

function applyPressureTint(
  root: THREEType.Object3D,
  mix: number,
  tintColor: THREEType.Color,
  workingColor: THREEType.Color,
): void {
  const clampedMix = Math.min(Math.max(mix, 0), 1);
  root.traverse((child) => {
    const mesh = child as THREEType.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      const mat = material as THREEType.Material & { color?: THREEType.Color; userData: Record<string, unknown> };
      if (!mat?.color) return;
      const baseKey = "__baseColor";
      if (!mat.userData[baseKey]) {
        mat.userData[baseKey] = mat.color.clone();
      }
      const baseColor = mat.userData[baseKey] as THREEType.Color;
      workingColor.copy(baseColor).lerp(tintColor, clampedMix);
      mat.color.copy(workingColor);
    });
  });
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

type PressureParticle = {
  sprite: THREEType.Sprite;
  velocity: THREEType.Vector3;
  life: number;
  maxLife: number;
};

type PressureEmitter = {
  particles: PressureParticle[];
  spawnAccumulator: number;
  height: number;
};

function attachPressureEmitter(
  root: THREEType.Object3D,
  height: number
): void {
  if (root.userData.pressureEmitter) return;
  root.userData.pressureEmitter = {
    particles: [],
    spawnAccumulator: 0,
    height
  } as PressureEmitter;
}

export function updatePressureEmitters(
  THREE: typeof THREEType,
  playerMeshes: THREEType.Object3D[],
  delta: number
): void {
  if (!flameTexture) return;
  playerMeshes.forEach((root) => {
    const student = root.userData?.studentRef as Student | undefined;
    if (!student) return;
    const emitter = root.userData?.pressureEmitter as PressureEmitter | undefined;
    if (!emitter) return;
    const rate = getEmissionRate(student.pressure);
    emitter.spawnAccumulator += rate * delta;
    while (emitter.spawnAccumulator >= 1) {
      spawnParticle(THREE, root, emitter);
      emitter.spawnAccumulator -= 1;
    }
    updateParticles(root, emitter, delta);
  });
}

function getEmissionRate(pressure: number): number {
  if (pressure >= PRESSURE_THRESHOLD_HIGH) return PRESSURE_EMIT_RATE_HIGH;
  if (pressure >= PRESSURE_THRESHOLD_MID) return PRESSURE_EMIT_RATE_MID;
  return 0;
}

function spawnParticle(
  THREE: typeof THREEType,
  root: THREEType.Object3D,
  emitter: PressureEmitter
): void {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: flameTexture ?? undefined,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.0,
  }));
  const scale = THREE.MathUtils.randFloat(0.16, 0.24);
  sprite.scale.setScalar(scale);
  const jitter = PRESSURE_EMIT_HORIZONTAL_JITTER;
  const refY = emitter.height * PRESSURE_EMIT_HEIGHT_RATIO;
  const baseY = Math.max(0.15, refY - PRESSURE_EMIT_BASE_DROP);
  sprite.position.set(
    THREE.MathUtils.randFloatSpread(jitter),
    baseY + THREE.MathUtils.randFloatSpread(PRESSURE_EMIT_VERTICAL_JITTER),
    THREE.MathUtils.randFloatSpread(jitter)
  );
  const velocity = new THREE.Vector3(
    THREE.MathUtils.randFloatSpread(PRESSURE_EMIT_HORIZONTAL_SPEED),
    THREE.MathUtils.randFloatSpread(0.05), // keep mostly flat; avoid upward bias
    THREE.MathUtils.randFloatSpread(PRESSURE_EMIT_HORIZONTAL_SPEED)
  );
  const life = THREE.MathUtils.randFloat(0.6, 1.0);
  root.add(sprite);
  emitter.particles.push({ sprite, velocity, life, maxLife: life });
}

function updateParticles(
  root: THREEType.Object3D,
  emitter: PressureEmitter,
  delta: number
): void {
  for (let i = emitter.particles.length - 1; i >= 0; i--) {
    const p = emitter.particles[i];
    p.life -= delta;
    if (p.life <= 0 || !p.sprite.material) {
      root.remove(p.sprite);
      if (p.sprite.material && "dispose" in p.sprite.material) {
        (p.sprite.material as THREEType.Material).dispose();
      }
      p.sprite.geometry?.dispose?.();
      emitter.particles.splice(i, 1);
      continue;
    }
    const mat = p.sprite.material as THREEType.SpriteMaterial;
    const t = p.life / p.maxLife;
    mat.opacity = Math.max(0, Math.min(1, t));
    p.sprite.position.addScaledVector(p.velocity, delta);
    p.velocity.y += delta * 0.3;
    mat.needsUpdate = true;
  }
}

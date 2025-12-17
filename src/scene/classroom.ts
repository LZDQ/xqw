import type * as THREEType from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Student } from "../core/Student.ts";
import { createWhiteboardDisplay, type WhiteboardDisplay } from "./whiteboardDisplay.ts";

const ROOM = { width: 14, depth: 10, height: 4 };
// Use root-relative paths so dev server/static builds serve public assets correctly.
const MODEL_BASE = "/assets/models/";
const FALLBACK_TEXTURE = "/assets/textures/WOOD 1_0.jpeg";
const MODEL_SCALE: Record<AssetKey, number> = {
  desk: 0.4,        // doubled to restore 2x sizing
  chair: 0.01,
  player: 0.035
};

type AssetKey = "desk" | "chair" | "player";

interface Seat {
  seatId: number;
  x: number;
  z: number;
}

export interface ClassroomInitResult {
  scene: THREEType.Scene;
  ready: Promise<void>;
  playerMeshes: THREEType.Object3D[];
  whiteboardDisplay: WhiteboardDisplay | null;
}

export function initClassroom(THREE: typeof THREEType, students: Student[]): ClassroomInitResult {
  const scene = new THREE.Scene();
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

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(5, 6, 3);
  keyLight.castShadow = false;
  scene.add(keyLight);

  const screenLight = new THREE.PointLight(0x4a86ff, 0.4, 8);
  screenLight.position.set(0, 2.5, -ROOM.depth / 2 + 0.3);
  scene.add(screenLight);

  const playerMeshes: THREEType.Object3D[] = [];
  const seatLayout = buildSeatLayout();
  const whiteboardHolder: { display: WhiteboardDisplay | null } = { display: null };
  const ready = loadClassroomAssets(THREE, scene, seatLayout, playerMeshes, students, whiteboardHolder);

  return { scene, ready, playerMeshes, whiteboardDisplay: whiteboardHolder.display };
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
  const rows = 3;
  const cols = 3;
  const startX = -3.5;
  const startZ = -1.5;
  const dx = 3.5;
  const dz = 2.0;
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

function loadClassroomAssets(
  THREE: typeof THREEType,
  scene: THREEType.Scene,
  seats: Seat[],
  playerMeshes: THREEType.Object3D[],
  students: Student[],
  whiteboardHolder: { display: WhiteboardDisplay | null }
): Promise<void> {
  const manager = new THREE.LoadingManager();
  manager.setURLModifier(url => {
    if(url.endsWith("textures/diffuse.png") || url.endsWith("textures/shadow.png")){
      return FALLBACK_TEXTURE;
    }
    return url;
  });
  const loader = new GLTFLoader(manager);
  loader.setPath(MODEL_BASE);
  loader.setResourcePath(MODEL_BASE);

  const assetsToLoad: Array<[AssetKey, string]> = [
    ["desk", "desk.glb"],
    ["chair", "chair.gltf"],
    ["player", "nairong.glb"]
  ];

  const loadPromises = assetsToLoad.map(([key, file]) =>
    loader.loadAsync(file).then(gltf => ({ key, gltf })).catch(err => {
      console.error(`[acg3d] failed to load ${file}`, err);
      return null;
    })
  );

  const seatTexture = new THREE.TextureLoader(manager).load(FALLBACK_TEXTURE);

  return Promise.all(loadPromises).then(results => {
    const assets: Partial<Record<AssetKey, THREEType.Object3D>> = {};
    results.forEach(entry => {
      if(!entry) return;
      const prepared = prepareAsset(THREE, entry.gltf.scene, MODEL_SCALE[entry.key]);
      assets[entry.key] = prepared;
    });
    // Text-only "whiteboard": no GLTF model, only the CanvasTexture plane.
    const boardRoot = new THREE.Group();
    boardRoot.name = "TextBoard";
    // Front wall is at z = -ROOM.depth / 2; push 1mm into the room to avoid z-fighting.
    boardRoot.position.set(0, 2.0, -ROOM.depth / 2 + 0.001);
    scene.add(boardRoot);

    const display = createWhiteboardDisplay(THREE, boardRoot, {
      width: 5.6,
      height: 3.0,
      offset: new THREE.Vector3(0, 0, 0),
      canvasWidth: 1024,
      canvasHeight: 512
    });
    display.setText(`OI Trainer 3D\nStudents: ${students.length}\n\n(text-only board)`);
    whiteboardHolder.display = display;
    scene.userData.whiteboardDisplay = display;
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
}

function prepareAsset(THREE: typeof THREEType, scene: THREEType.Object3D, scale = 1): THREEType.Object3D{
  scene.traverse(child => {
    const mesh = child as THREEType.Mesh;
    if(mesh.isMesh){
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.visible = true;
      mesh.frustumCulled = false;
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
    player.position.set(0, 0, 0.35);
    player.rotation.y = Math.PI;
    attachStatusRing(THREE, player);
    tagPlayerHierarchy(player, `p${seat.seatId}`);
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

function attachStatusRing(THREE: typeof THREEType, player: THREEType.Object3D): void{
  const ringGeo = new THREE.RingGeometry(0.2, 0.32, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x7cc5ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.02, 0);
  player.add(ring);
  player.userData.statusRing = ring;
}

function applyTextureIfMissing(
  object: THREEType.Object3D,
  texture: THREEType.Texture
): void {
  object.traverse((child) => {
    const mesh = child as THREEType.Mesh;
    if (mesh.isMesh) {
      const mat = mesh.material as THREEType.MeshStandardMaterial;
      if (mat && !mat.map) {
        mat.map = texture;
        mat.needsUpdate = true;
      }
    }
  });
}

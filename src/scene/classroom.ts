import type * as THREEType from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

const ROOM = { width: 14, depth: 10, height: 4 };
const MODEL_BASE = new URL("../../public/assets/models/", import.meta.url).href;
const FALLBACK_TEXTURE = new URL("../../public/assets/textures/WOOD 1_0.jpeg", import.meta.url).href;
const MODEL_SCALE: Record<AssetKey, number> = {
  desk: 0.4,        // doubled to restore 2x sizing
  chair: 0.01,
  player: 0.035,
  whiteboard: 0.01
};

type AssetKey = "desk" | "chair" | "player" | "whiteboard";

interface Seat {
  x: number;
  z: number;
  index: number;
}

export interface ClassroomInitResult {
  scene: THREEType.Scene;
  ready: Promise<void>;
  playerMeshes: THREEType.Object3D[];
}

export function initClassroom(THREE: typeof THREEType): ClassroomInitResult{
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
  const ready = loadClassroomAssets(THREE, scene, seatLayout, playerMeshes);

  return { scene, ready, playerMeshes };
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

function buildSeatLayout(): Seat[]{
  const rows = 2;
  const cols = 2;
  const startX = -3;
  const startZ = -1.5;
  const seats: Seat[] = [];
  let idx = 0;
  for(let r = 0; r < rows; r++){
    for(let c = 0; c < cols; c++){
      const x = startX + c * 3.5;
      const z = startZ + r * 2.5;
      seats.push({ x, z, index: idx++ });
    }
  }
  return seats;
}

function loadClassroomAssets(
  THREE: typeof THREEType,
  scene: THREEType.Scene,
  seats: Seat[],
  playerMeshes: THREEType.Object3D[]
): Promise<void>{
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
    ["player", "nairong.glb"],
    ["whiteboard", "whiteboard.glb"]
  ];

  const loadPromises = assetsToLoad.map(([key, file]) =>
    loader.loadAsync(file).then(gltf => ({ key, gltf })).catch(err => {
      console.error(`[acg3d] failed to load ${file}`, err);
      return null;
    })
  );

  return Promise.all(loadPromises).then(results => {
    const assets: Partial<Record<AssetKey, THREEType.Object3D>> = {};
    results.forEach(entry => {
      if(!entry) return;
      const prepared = prepareAsset(THREE, entry.gltf.scene, MODEL_SCALE[entry.key]);
      assets[entry.key] = prepared;
    });
    if(assets.whiteboard){
      const whiteboard = cloneAsset(assets.whiteboard);
      const bounds = new THREE.Box3().setFromObject(whiteboard);
      const halfHeight = (bounds.max.y - bounds.min.y) / 2;
      const boardDepth = (bounds.max.z - bounds.min.z) / 2;
      whiteboard.position.set(0, halfHeight + 0.35, -ROOM.depth / 2 + boardDepth);
      whiteboard.rotation.y = Math.PI / 2;
      scene.add(whiteboard);
    }
    seats.forEach(seat => {
      addSeat(THREE, scene, seat, assets, playerMeshes);
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

function addSeat(
  THREE: typeof THREEType,
  scene: THREEType.Scene,
  seat: Seat,
  assets: Partial<Record<AssetKey, THREEType.Object3D>>,
  playerMeshes: THREEType.Object3D[]
): void{
  const root = new THREE.Group();
  root.position.set(seat.x, 0, seat.z);
  scene.add(root);

  if(assets.desk){
    const desk = cloneAsset(assets.desk);
    desk.rotation.y = Math.PI;
    root.add(desk);
  }
  if(assets.chair){
    const chair = cloneAsset(assets.chair);
    chair.position.set(0, 0, 0.7);
    chair.rotation.y = Math.PI;
    root.add(chair);
  }
  if(assets.player){
    const player = cloneAsset(assets.player);
    player.position.set(0, 0, 0.35);
    player.rotation.y = Math.PI;
    attachStatusRing(THREE, player);
    tagPlayerHierarchy(player, `p${seat.index + 1}`);
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

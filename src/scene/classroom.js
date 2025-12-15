import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

const ROOM = { width: 14, depth: 10, height: 4 };
const MODEL_BASE = new URL("../../public/assets/models/", import.meta.url).href;
const FALLBACK_TEXTURE = new URL("../../public/assets/textures/WOOD 1_0.jpeg", import.meta.url).href;
const MODEL_SCALE = {
  desk: 0.4,        // doubled to restore 2x sizing
  chair: 0.01,
  player: 0.035,
  whiteboard: 0.01
};

export function initClassroom(THREE){
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f7fb);

  // Floor and walls
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
  const walls = [];
  walls.push(makeWall(THREE, ROOM.width, ROOM.height, ROOM.depth / 2, 0, Math.PI));          // back
  walls.push(makeWall(THREE, ROOM.width, ROOM.height, -ROOM.depth / 2, 0, 0));                // front
  walls.push(makeWall(THREE, ROOM.depth, ROOM.height, 0, ROOM.width / 2, -Math.PI / 2, true));// right
  walls.push(makeWall(THREE, ROOM.depth, ROOM.height, 0, -ROOM.width / 2, Math.PI / 2, true));// left
  walls.forEach(w => { w.material = wallMat; scene.add(w); });

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(5, 6, 3);
  keyLight.castShadow = false;
  scene.add(keyLight);

  const screenLight = new THREE.PointLight(0x4a86ff, 0.4, 8);
  screenLight.position.set(0, 2.5, -ROOM.depth / 2 + 0.3);
  scene.add(screenLight);

  const players = [];
  const seatLayout = buildSeatLayout();
  const ready = loadClassroomAssets(THREE, scene, seatLayout, players);

  // Button panel on right wall
  const buttonData = [
    { label: "模拟赛", action: "simulate" },
    { label: "训练", action: "train" },
    { label: "吃饭", action: "eat" },
    { label: "外出集训", action: "camp" }
  ];
  const buttons = buildButtons(THREE, buttonData);
  const panelGroup = new THREE.Group();
  panelGroup.position.set(ROOM.width / 2 - 0.2, 1.4, -ROOM.depth / 4);
  panelGroup.rotation.y = -Math.PI / 2;
  buttons.forEach((btn, i) => {
    btn.position.y = (buttonData.length - 1 - i) * 0.5;
    panelGroup.add(btn);
  });
  scene.add(panelGroup);

  return { scene, players, buttons, ready };
}

export function updatePlayerMeshes(THREE, meshes, playersData, selectedId){
  const statusColors = {
    idle: 0x7cc5ff,
    training: 0x9acd32,
    contest: 0xffc857,
    eating: 0x7be0b5,
    camp: 0xff8c69,
    busy: 0xd1b3ff
  };
  meshes.forEach(mesh => {
    const p = playersData.find(s => s.id === mesh.userData.playerId);
    if(!p) return;
    const color = statusColors[p.status] || statusColors.idle;
    const ring = mesh.userData.statusRing;
    if(ring){
      ring.material.color.set(color);
      ring.material.opacity = mesh.userData.playerId === selectedId ? 0.85 : 0.55;
      const scale = mesh.userData.playerId === selectedId ? 1.25 : 1.0;
      ring.scale.set(scale, 1, scale);
    }
  });
}

function makeWall(THREE, width, height, z, x = 0, rotY = 0, swap = false){
  const geo = swap ? new THREE.PlaneGeometry(width, height) : new THREE.PlaneGeometry(width, height);
  const mesh = new THREE.Mesh(geo);
  mesh.position.set(x, height / 2, z);
  mesh.rotation.y = rotY;
  return mesh;
}

function buildButtons(THREE, list){
  const buttons = [];
  const geo = new THREE.BoxGeometry(0.3, 0.18, 0.05);
  list.forEach(item => {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2c71ff, emissive: 0x1a3366, roughness: 0.35 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.action = item.action;
    mesh.userData.label = item.label;
    buttons.push(mesh);
  });
  return buttons;
}

function buildSeatLayout(){
  const rows = 2;
  const cols = 2;
  const startX = -3;
  const startZ = -1.5;
  const seats = [];
  let idx = 0;
  for(let r=0; r<rows; r++){
    for(let c=0; c<cols; c++){
      const x = startX + c * 3.5;
      const z = startZ + r * 2.5;
      seats.push({ x, z, index: idx++ });
    }
  }
  return seats;
}

function loadClassroomAssets(THREE, scene, seats, playerMeshes){
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
  const assetsToLoad = [
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
    const assets = {};
    results.forEach(entry => {
      if(!entry) return;
      const prepared = prepareAsset(THREE, entry.gltf.scene, MODEL_SCALE[entry.key] || 1);
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

function prepareAsset(THREE, scene, scale = 1){
  scene.traverse(child => {
    if(child.isMesh){
      child.castShadow = true;
      child.receiveShadow = true;
      child.visible = true;
      child.frustumCulled = false;
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

function cloneAsset(scene){
  return cloneSkinned(scene);
}

function addSeat(THREE, scene, seat, assets, playerMeshes){
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

function tagPlayerHierarchy(root, playerId){
  root.userData.playerId = playerId;
  root.traverse(child => {
    if(child.isMesh || child.isGroup){
      child.userData.playerId = playerId;
    }
  });
}

function attachStatusRing(THREE, player){
  const ringGeo = new THREE.RingGeometry(0.2, 0.32, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x7cc5ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.02, 0);
  player.add(ring);
  player.userData.statusRing = ring;
}

const ROOM = { width: 14, depth: 10, height: 4 };

export function initClassroom(THREE){
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f7fb);

  // Floor and walls
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.width, ROOM.depth),
    new THREE.MeshStandardMaterial({ color: 0xe9edf5, roughness: 0.9, metalness: 0.05 })
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

  // Debug helpers
  const axes = new THREE.AxesHelper(1.2);
  scene.add(axes);

  const debugCube = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xff5555, emissive: 0x330000 })
  );
  debugCube.position.set(0, 0.25, 2);
  scene.add(debugCube);

  // Desks and players (simple placeholders)
  const desks = [];
  const players = [];
  const deskGeo = new THREE.BoxGeometry(1.8, 0.1, 1);
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x2a3544, roughness: 0.6 });
  const chairGeo = new THREE.BoxGeometry(0.6, 0.8, 0.6);
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x202733, roughness: 0.5 });
  const playerGeo = new THREE.SphereGeometry(0.25, 16, 16);
  const playerMat = new THREE.MeshStandardMaterial({ color: 0x7cc5ff, emissive: 0x0a1a2c, roughness: 0.3 });

  const rows = 2;
  const cols = 2;
  const startX = -3;
  const startZ = -1.5;
  let idx = 0;
  for(let r=0; r<rows; r++){
    for(let c=0; c<cols; c++){
      const x = startX + c*3.5;
      const z = startZ + r*2.5;
      const desk = new THREE.Mesh(deskGeo, deskMat);
      desk.position.set(x, 0.8, z);
      scene.add(desk);
      desks.push(desk);

      const chair = new THREE.Mesh(chairGeo, chairMat);
      chair.position.set(x, 0.4, z+0.7);
      scene.add(chair);

      const player = new THREE.Mesh(playerGeo, playerMat.clone());
      player.position.set(x, 1.2, z+0.3);
      player.userData.playerId = `p${idx+1}`;
      scene.add(player);
      players.push(player);
      idx++;
    }
  }

  // Whiteboard
  const whiteboard = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 2.5),
    new THREE.MeshStandardMaterial({ color: 0x0f1620, emissive: 0x0b1c32, roughness: 0.2 })
  );
  whiteboard.position.set(0, 2, -ROOM.depth / 2 + 0.01);
  scene.add(whiteboard);

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

  return { scene, players, buttons };
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
    mesh.material.color = new THREE.Color(color);
    mesh.material.emissive = new THREE.Color(color).multiplyScalar(mesh.userData.playerId === selectedId ? 0.4 : 0.15);
    mesh.scale.setScalar(mesh.userData.playerId === selectedId ? 1.15 : 1.0);
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

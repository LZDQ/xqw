import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface AirConditionerOptions {
  scene: THREE.Scene;
  position?: THREE.Vector3;
  modelUrl?: string;
  particleTextureUrl?: string;
  initialTemperature?: number;
  initiallyOn?: boolean;
}

interface ParticleState {
  alive: boolean;
  age: number;
  life: number;
  velocity: THREE.Vector3;
}

/**
 * Wall‑mounted air conditioner with optional airflow particles.
 * Rendering-only: controlled externally via exposed methods.
 */
export class AirConditioner {
  private group: THREE.Group;
  private airflowGroup: THREE.Points;
  private particleGeo: THREE.BufferGeometry;
  private particleMat: THREE.PointsMaterial;
  private particles: ParticleState[];
  private maxParticles = 200;
  private emitRate = 60; // particles per second
  private emitTimer = 0;
  // Default airflow direction rotated 90° CCW in XZ plane relative to +Z
  private flowDir = new THREE.Vector3(1, -0.2, 0).normalize();
  private temp = 24;
  private powered = true;

  constructor(options: AirConditionerOptions) {
    const {
      scene,
      position = new THREE.Vector3(0, 3.4, -4.6),
      modelUrl = "/assets/models/air_conditioner.glb",
      particleTextureUrl,
      initialTemperature = 24,
      initiallyOn = true,
    } = options;

    this.temp = initialTemperature;
    this.powered = initiallyOn;

    this.group = new THREE.Group();
    this.group.position.copy(position);
    scene.add(this.group);

    this.particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxParticles * 3);
    const alphas = new Float32Array(this.maxParticles);
    this.particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.particleGeo.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));
    this.particleGeo.setDrawRange(0, 0);

    const flowTexture = this.loadFlowTexture(particleTextureUrl);
    this.particleMat = new THREE.PointsMaterial({
      size: 0.08,
      transparent: true,
      depthWrite: false,
      opacity: 0.8,
      color: 0xffffff,
      blending: THREE.AdditiveBlending,
      map: flowTexture,
      alphaMap: flowTexture,
    });
    this.particleMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        "void main() {",
        `
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
        `
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "void main() {",
        `
        varying float vAlpha;
        void main() {
        `
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "gl_FragColor = vec4( outgoingLight, diffuseColor.a );",
        "gl_FragColor = vec4( outgoingLight, diffuseColor.a * vAlpha );"
      );
    };

    this.airflowGroup = new THREE.Points(this.particleGeo, this.particleMat);
    this.group.add(this.airflowGroup);

    this.particles = Array.from({ length: this.maxParticles }, () => ({
      alive: false,
      age: 0,
      life: 0,
      velocity: new THREE.Vector3(),
    }));

    this.loadModel(modelUrl);
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  isOn(): boolean {
    return this.powered;
  }

  toggle(): void {
    this.powered = !this.powered;
    if (!this.powered) {
      this.clearFlowParticles();
    }
  }

  getTemperature(): number {
    return this.temp;
  }

  setTemperature(value: number): void {
    this.temp = THREE.MathUtils.clamp(value, 16, 30);
  }

  setFlowDirection(direction: THREE.Vector3): void {
    const dir = direction.clone();
    if (dir.lengthSq() === 0) return;
    this.flowDir.copy(dir.normalize());
  }

  clearFlowParticles(): void {
    this.particles.forEach(p => (p.alive = false));
    this.particleGeo.setDrawRange(0, 0);
    (this.particleGeo.getAttribute("alpha") as THREE.BufferAttribute).needsUpdate = true;
  }

  update(dt: number): void {
    this.updateParticles(dt);
    if (this.powered) {
      this.emitParticles(dt);
    }
    this.syncGeometry();
  }

  dispose(): void {
    this.clearFlowParticles();
    this.group.removeFromParent();
    this.particleGeo.dispose();
    this.particleMat.dispose();
    this.particleMat.map?.dispose();
  }

  private loadModel(url: string): void {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = false;
            mesh.receiveShadow = false;
          }
        });
        model.position.set(0, 0, 0);
        model.scale.setScalar(1);
        this.group.add(model);
      },
      undefined,
      () => {
        const placeholder = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 0.4, 0.35),
          new THREE.MeshStandardMaterial({ color: 0xdce3ec, roughness: 0.6, metalness: 0.05 })
        );
        placeholder.position.set(0, 0, 0);
        this.group.add(placeholder);
      }
    );
  }

  private loadFlowTexture(url?: string): THREE.Texture {
    const loader = new THREE.TextureLoader();
    if (url) {
      return loader.load(url, (tex) => {
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;
      });
    }

    const size = 16;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - size / 2;
        const dy = y - size / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const alpha = Math.max(0, 1 - dist / (size / 2));
        const idx = (y * size + x) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = Math.floor(alpha * 255);
      }
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.needsUpdate = true;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  private emitParticles(dt: number): void {
    this.emitTimer += dt;
    const count = Math.floor(this.emitTimer * this.emitRate);
    if (count <= 0) return;
    this.emitTimer -= count / this.emitRate;

    this.group.updateWorldMatrix(true, false);
    const baseDir = this.flowDir.clone().applyQuaternion(this.group.quaternion);
    // Emit along a horizontal slot parallel to the wall (AC outlet)
    const originBase = new THREE.Vector3(0, 4.65, 0);
    const slotWidth = 5.0; // span along local Z; scaled by parent scale
    for (let i = 0; i < count; i++) {
      const slot = this.findDeadParticle();
      if (slot === -1) break;
      const state = this.particles[slot];
      state.alive = true;
      state.age = 0;
      state.life = 2 + Math.random() * 1;
      const jitter = new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.2
      ).applyQuaternion(this.group.quaternion);
      state.velocity.copy(baseDir).multiplyScalar(1.2 + Math.random() * 0.4).add(jitter);

      const posAttr = this.particleGeo.getAttribute("position") as THREE.BufferAttribute;
      const ox = originBase.x + 0.12; // slight forward offset
      const oy = originBase.y + (Math.random() - 0.5) * 0.02; // minimal vertical jitter
      const oz = originBase.z + (Math.random() - 0.5) * slotWidth;
      posAttr.setXYZ(slot, ox, oy, oz);
    }
  }

  private updateParticles(dt: number): void {
    const posAttr = this.particleGeo.getAttribute("position") as THREE.BufferAttribute;
    const alphaAttr = this.particleGeo.getAttribute("alpha") as THREE.BufferAttribute;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.alive) {
        alphaAttr.setX(i, 0);
        continue;
      }
      p.age += dt;
      if (p.age >= p.life) {
        p.alive = false;
        alphaAttr.setX(i, 0);
        continue;
      }
      const lifeT = 1 - p.age / p.life;
      alphaAttr.setX(i, lifeT);
      const x = posAttr.getX(i) + p.velocity.x * dt;
      const y = posAttr.getY(i) + p.velocity.y * dt;
      const z = posAttr.getZ(i) + p.velocity.z * dt;
      posAttr.setXYZ(i, x, y, z);
    }
  }

  private syncGeometry(): void {
    const aliveCount = this.particles.reduce((acc, p) => acc + (p.alive ? 1 : 0), 0);
    this.particleGeo.setDrawRange(0, Math.max(aliveCount, 0));
    (this.particleGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.particleGeo.getAttribute("alpha") as THREE.BufferAttribute).needsUpdate = true;
  }

  private findDeadParticle(): number {
    for (let i = 0; i < this.maxParticles; i++) {
      if (!this.particles[i].alive) return i;
    }
    return -1;
  }
}


# Air Conditioner API

Self‑contained 3D Air Conditioner component; depends only on Three.js/loader utilities. Game logic may hold a reference to call its public methods. Recommended location: `src/objects/AirConditioner.ts`.

## Class: `AirConditioner`

Constructs and manages a wall‑mounted AC model plus optional airflow particle system.

- **constructor(options: AirConditionerOptions)**  
  - `scene: THREE.Scene` – parent scene to attach the AC group.  
  - `position?: THREE.Vector3` – world position for the AC housing.  
  - `rotation?: THREE.Euler` – orientation (defaults to facing the room).  
  - `modelUrl?: string` – GLTF/GLB path for the unit; otherwise a simple box placeholder is built.  
  - `flowTextureUrl?: string` – sprite/texture for the airflow particles.  
  - `initialTemperature?: number` – starting temperature in °C (default 24).  
  - `initialFanSpeed?: number` – 0..1 scalar controlling airflow strength (default 0.5).  
  - `initiallyOn?: boolean` – whether airflow is active at spawn.

### Public methods

- `getGroup(): THREE.Group`  
  Returns the root group containing both the AC housing and the airflow system; useful for parenting or picking.

- `isOn(): boolean`  
  Indicates whether the AC is currently emitting airflow.

- `toggle(): void`  
  Convenience to switch between on/off states.

- `getTemperature(): number`  
  Current setpoint in °C.

- `setTemperature(value: number): void`  
  Clamps/stores the setpoint; can be called regardless of power state.

- `getFanSpeed(): number`  
  Returns the 0..1 airflow strength scalar.

- `setFanSpeed(value: number): void`  
  Clamps/stores the airflow strength and updates particle emission rate/velocity.

- `setFlowDirection(direction: THREE.Vector3): void`  
  Sets a normalized direction vector for emitted particles (defaults to forward/downward).

- `setFlowVisible(visible: boolean): void`  
  Shows or hides the particle system without changing power state; useful for cutscenes/FX.

- `setFlowPersistence(seconds: number): void`  
  Sets how long particles live after emission; controls fade-out/trail length.

- `clearFlowParticles(): void`  
  Immediately removes all currently emitted particles (useful when moving or disabling the AC).

- `setPosition(position: THREE.Vector3): void`  
  Repositions the whole AC assembly in world space.

- `setRotation(rotation: THREE.Euler): void`  
  Rotates the AC assembly.

- `update(dt: number): void`  
  Advances particle animation; call from the main render loop. No game‑logic dependencies. Particles are emitted with slight randomness in velocity/offset to avoid a static ribbon; direction follows the latest `setFlowDirection` with per-particle variance.

- `dispose(): void`  
  Removes the AC from the scene and disposes geometries/materials/textures/emitters.

## Usage example

```ts
import { AirConditioner } from '@/objects/AirConditioner';

const ac = new AirConditioner({
  scene,
  position: new THREE.Vector3(0, 2.4, -4),
  modelUrl: '/assets/models/ac.glb',
  flowTextureUrl: '/assets/textures/air-sprite.png',
  initialTemperature: 23,
  initiallyOn: true,
});

ac.setTemperature(22);
ac.setFanSpeed(0.8);
ac.setFlowDirection(new THREE.Vector3(0, -0.2, 1).normalize());
ac.setFlowPersistence(1.2); // particles live for 1.2s before fading out
ac.clearFlowParticles(); // call if you reposition the AC and need to reset trails
ac.update(deltaTime); // inside your main loop
```

# Developer Notes (OI Trainer 3D)

## Whiteboard Text Display (CanvasTexture)

The classroom whiteboard model is loaded in `src/scene/classroom.ts` and a dynamic “screen” is attached to it using `CanvasTexture`.

This is intentionally **not** DOM-based: the board text is drawn onto an offscreen `<canvas>`, uploaded to the GPU as a texture, then rendered on a plane in 3D.

### Where It Is Implemented

- Whiteboard placement: `src/scene/classroom.ts`
- Whiteboard display helper: `src/scene/whiteboardDisplay.ts`

### How It Works

1. Create an offscreen canvas (`1024x512` by default).
2. Draw background + border + text via `CanvasRenderingContext2D`.
3. Create `THREE.CanvasTexture(canvas)` and use it on a `MeshBasicMaterial`.
4. Attach a `PlaneGeometry` mesh (`WhiteboardDisplay`) to the loaded whiteboard model and offset it slightly forward to avoid z-fighting.
5. When you update the text, redraw the canvas and set `texture.needsUpdate = true`.

### How To Update The Whiteboard Text

When the classroom loads, the display instance is stored in both places:

- Returned as `whiteboardDisplay` from `initClassroom(...)`.
- Also attached to the scene as `scene.userData.whiteboardDisplay` (convenient global access for later systems).

Example usage (e.g. from `src/main.ts` after `initClassroom`):

```ts
const { scene, whiteboardDisplay } = initClassroom(THREE, gameState?.students ?? []);

whiteboardDisplay?.setText("Week 1\nChoose an action");

// or, if you only have the scene:
const display = scene.userData.whiteboardDisplay as { setText: (t: string) => void } | undefined;
display?.setText("Hello from scene.userData");
```

### Adjusting Size / Placement

The display plane is positioned in the whiteboard model’s local space.

If it appears too small/large or is not aligned with the “writing area”, tune the parameters in
`src/scene/classroom.ts` where `createWhiteboardDisplay(...)` is called:

- `width`, `height`: plane size in meters (relative to the whiteboard model’s bounding box).
- `offset`: local position (`x`, `y`, `z`) relative to the whiteboard model.

If you see flickering on the board surface, increase the `offset.z` a bit (z-fighting).

## Object Hierarchy (Runtime)

This is the relevant scene graph shape after classroom assets load (simplified):

- `Scene`
  - `Floor` (plane mesh)
  - `Walls` (4 plane meshes)
  - `Lights`
    - `AmbientLight`
    - `DirectionalLight`
    - `PointLight` (near board)
  - `Whiteboard` (GLTF root object, cloned)
    - `WhiteboardDisplay` (plane mesh with `CanvasTexture`)
  - `Seats` (many groups)
    - `SeatRoot` (group per seat)
      - `Desk` (cloned mesh)
      - `Chair` (cloned mesh)
      - `Player` (cloned mesh, only if seat has a student)
        - `StatusRing` (ring mesh)

Note: the “Seats” grouping is conceptual; in code each seat is a `THREE.Group` added directly to the scene in `renderSeat(...)`.


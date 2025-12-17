# Developer Notes (OI Trainer 3D)

## Whiteboard Text Display (CanvasTexture)

The classroom uses a **text-only board** (no GLTF whiteboard model). A dynamic “screen” is rendered via `CanvasTexture` on a plane mesh placed near the front wall.

This is intentionally **not** DOM-based: the board text is drawn onto an offscreen `<canvas>`, uploaded to the GPU as a texture, then rendered on a plane in 3D.

### Where It Is Implemented

- Whiteboard placement: `src/scene/classroom.ts`
- Whiteboard display helper: `src/scene/whiteboardDisplay.ts`

### How It Works

1. Create an offscreen canvas (`1024x512` by default).
2. Draw background + border + text via `CanvasRenderingContext2D`.
3. Create `THREE.CanvasTexture(canvas)` and use it on a `MeshBasicMaterial`.
4. Attach a `PlaneGeometry` mesh (`WhiteboardDisplay`) to a `TextBoard` group near the front wall, with a small Z offset to avoid z-fighting.
5. When you update the text, redraw the canvas and set `texture.needsUpdate = true`.

### How To Update The Whiteboard Text

When the classroom finishes loading (after `ready` resolves), the display instance is stored in both places:

- Returned as `whiteboardDisplay` from `initClassroom(...)`.
- Also attached to the scene as `scene.userData.whiteboardDisplay` (convenient global access for later systems).

Example usage (e.g. from `src/main.ts` after `initClassroom`):

```ts
const { scene, whiteboardDisplay, ready } = initClassroom(THREE, gameState.students);

ready.then(() => {
  whiteboardDisplay?.setText("Week 1\nChoose an action");
});

// or, if you only have the scene:
const display = scene.userData.whiteboardDisplay as { setText: (t: string) => void } | undefined;
ready.then(() => display?.setText("Hello from scene.userData"));
```

### Adjusting Size / Placement

The display plane is positioned in the `TextBoard` group’s local space.

If it appears too small/large or not aligned on the wall, tune the parameters in
`src/scene/classroom.ts` where `TextBoard` and `createWhiteboardDisplay(...)` are created:

- `width`, `height`: plane size in meters (relative to the whiteboard model’s bounding box).
- `boardRoot.position`: world placement of the board (should sit near `z = -ROOM.depth/2 + epsilon`).
- `offset`: local position (`x`, `y`, `z`) relative to the `TextBoard` group.

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
  - `TextBoard` (group)
    - `WhiteboardDisplay` (plane mesh with `CanvasTexture`)
  - `Seats` (many groups)
    - `SeatRoot` (group per seat)
      - `Desk` (cloned mesh)
      - `Chair` (cloned mesh)
      - `Player` (cloned mesh, only if seat has a student)
        - `StatusRing` (ring mesh)

Note: the “Seats” grouping is conceptual; in code each seat is a `THREE.Group` added directly to the scene in `renderSeat(...)`.

## GameState Hierarchy

`GameState` is created by the start screen (`src/ui/start.ts`) and passed into the 3D scene bootstrap (`src/main.ts`).

High-level structure (see `src/core/GameState.ts`):

- `GameState`
  - `students: Student[]`
  - `facilities: Facilities`
    - `computer: number`
    - `ac: number`
    - `dorm: number`
    - `library: number`
    - `canteen: number`
  - `week: number`
  - `budget: number`
  - `reputation: number`
  - `temperature: number`
  - `weather: string`
  - `provinceId: number`
  - `provinceName: string`
  - `provinceType: "STRONG" | "NORMAL" | "WEAK" | ""`
  - `isNorth: boolean`
  - `difficulty: number`
  - `difficultyConfig: DifficultyConfig | undefined`
  - `provinceConfig: ProvinceConfig | undefined`
  - `provinceClimate: ClimateProfile | null`
  - Progress counters / flags
    - `initialStudents`, `quitStudents`
    - `hadGoodResultRecently`, `weeksSinceEntertainment`, `weeksSinceGoodResult`
    - `totalExpenses`, `seasonEndTriggered`
  - Competitions / qualification
    - `qualification: [QualificationMap, QualificationMap]` (upper/lower half-year)
    - `completedCompetitions: Set<string>`
    - `careerCompetitions: unknown[]` (placeholder)
  - 3D integration
    - `scene: THREE.Scene | null` (set in `src/main.ts` after `initClassroom`)

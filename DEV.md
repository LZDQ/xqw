# Developer Notes (OI Trainer 3D)

## Whiteboard Display (CSS3D + base-game DOM)

The whiteboard now uses a CSS3D overlay that renders the actual **base-game HTML/CSS** (an iframe of `base-game/game.html?embedded=1` with scripts sandboxed).
The DOM is mapped into 3D space and scaled to the board dimensions; action cards are detected via measured DOM rects and mirrored with invisible 3D boxes for raycasts.

### Where It Is Implemented

- Whiteboard placement: `src/scene/classroom.ts`
- Whiteboard display helper: `src/scene/whiteboardDisplay.ts`

### How It Works

1. `createWhiteboardDisplay` builds a `<div>` + sandboxed `<iframe>` pointing at `base-game/game.html?embedded=1`.
2. A `CSS3DObject` wraps the element, is scaled to `BOARD_SIZE` (5.6m x 3.0m), and placed on the front wall.
3. On iframe load, DOM rects for the four action cards are measured and converted into invisible `BoxGeometry` meshes on the board for raycasting.
4. The CSS3D scene is rendered with `CSS3DRenderer` stacked over the WebGL canvas; pointer events are disabled so pointer lock works as usual.

### Adjusting Size / Placement

If it appears misaligned, tune `BOARD_SIZE` and the board position in `classroom.ts`.
Action hitboxes are derived from DOM measurements; if the right column layout changes,
update the DOM id mapping in `whiteboardDisplay.ts`.

## Object Hierarchy (Runtime)

This is the relevant scene graph shape after classroom assets load (simplified):

- `Scene`
  - `Floor` (plane mesh)
  - `Walls` (4 plane meshes)
  - `Lights`
    - `AmbientLight`
    - `DirectionalLight`
    - `PointLight` (near board)
  - `WhiteboardRoot` (group on front wall)
    - `Action` meshes (invisible boxes aligned to DOM cards)
  - `Seats` (many groups)
    - `SeatRoot` (group per seat)
      - `Desk` (cloned mesh)
      - `Chair` (cloned mesh)
      - `Player` (cloned mesh, only if seat has a student)
        - `StatusRing` (ring mesh)

Note: the “Seats” grouping is conceptual; in code each seat is a `THREE.Group` added directly to the scene in `renderSeat(...)`.

The CSS3D whiteboard DOM sits in a parallel `cssScene` and is rendered with `CSS3DRenderer`
using the same camera, so its transform matches `WhiteboardRoot`.

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

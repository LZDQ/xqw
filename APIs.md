## GameState API (`src/core/GameState.ts`)

- Responsibility: owns the simulation state migrated from the legacy HUD game (students, facilities, economy, weather, and season flow) and exposes helpers the 3D UI can query or mutate.
- Types: `QualificationMap = Record<CompetitionName, Set<string>>`; `GameState` is the main export (module also defines internal `Facilities` helper plus random/clamp/name utilities).

**Constructor**

- `new GameState(difficulty: number, provinceId: number, numStudents: number)`: looks up difficulty/province configs (falls back to id 2 / first province), sets difficulty budget multiplier and ability offset, derives base comfort (north vs south), base budget (`province.baseBudget * difficulty.budgetMultiplier`), clamps students to 1–9, creates seated `Student` instances with abilities sampled from province range plus difficulty offset, seeds two empty qualification maps, and rolls starting weather.

**Public properties** (mutable across the weekly loop)

- `students: Student[]` generated in ctor with unique `seatId` when possible (1–9).
- `facilities: Facilities` (levels default to 1).
- Economy/progression: `budget`, `week`, `reputation`, `totalExpenses`, `completedCompetitions`, `careerCompetitions`, `qualification` (tuple of two `QualificationMap`s), `seasonEndTriggered`.
- Environment: `temperature`, `weather`, `provinceId`, `provinceName`, `provinceType`, `isNorth`, `provinceClimate`, `baseComfort`.
- Difficulty/context: `difficulty`, `difficultyConfig`, `provinceConfig`, `initialStudents`, `quitStudents`, `hadGoodResultRecently`, `weeksSinceEntertainment`, `weeksSinceGoodResult`.
- Rendering bridge: `scene: THREE.Scene | null` (filled by `main.ts` after classroom init).

**Facilities helper** (internal)

- Levels: `computer`, `ac`, `dorm`, `library`, `canteen` all start at 1.
- Effects: `getComputerEfficiency()`, `getLibraryEfficiency()`, `getCanteenPressureReduction()`, `getDormComfortBonus()`.
- Limits/costs: `getMaxLevel(fac)` returns 5 for computer/library else 3; `getMaintenanceCost()` grows as `floor(100 * (levelSum)^1.2)`.

**Key methods**

- `getWeatherFactor()`: returns 1 normally; in extreme hot/cold returns 1.5 with base AC or 2.0 if both AC and dorm are level 1 (otherwise 1).
- `getComfort()`: base comfort (north/south) plus dorm/AC/canteen bonuses minus extreme-weather penalty (larger if AC at level 1), clamped 0–100.
- `getWeeklyCost()`: base 1000 + 50 per active student + facilities maintenance.
- `getDifficultyModifier()`: 0.9 for id 1, 1.1 for id 3, 1.2 for id 4, else 1.0.
- `getTrainingQuality()`: pulls province training quality constant by type (strong/normal/weak).
- `recordExpense(amount, description?)`: applies global `COST_MULTIPLIER`, deducts from budget with floor at 0, accumulates `totalExpenses`, returns the charged amount.
- `updateWeather()`: derives month/season from `week`, consults province climate (or fallback per region), samples temperature via normal distribution, then assigns weather (`晴`/`阴`/`雨`/`雪`) with seasonal precipitation odds; has a catch-all fallback generator if anything throws.
- `recoverWeeklyPressure()`: weekly decay on each active student’s `pressure`, `pressure_modifier`, and `comfort_modifier` by `RECOVERY_RATE`, never below 0.

**Notable internals** (private but important for behavior)

- `createStudents(count)`: shuffles seat ids 1–9, samples thinking/coding/mental from a normal distribution within province ability ranges and difficulty offset, names students `${provinceName || "学生"}-${n}`.
- `createEmptyQualificationMap()`: initializes Sets for every competition name; used for both qualification slots.
- Random helpers `uniform`, `normal`, `clamp`, `generateName` live in module scope (not exported).

## Whiteboard API (`src/scene/Whiteboard.ts`)

- **Responsibility**: A hybrid View-Controller that manages both the physical presence (occlusion/raycasting) and visual presentation (DOM/CSS) of the classroom whiteboard. It replaces the standalone `BoardDom` by internally generating the UI based on the `GameState` and bridging 3D raycast events to 2D DOM interactions via UV mapping.
- **Types**: `Whiteboard` is the main export.

**Constructor**

- `new Whiteboard(width: number, height: number, initialState?: GameState)`:
  - Initializes the internal DOM resolution (width fixed at 1400px, height calculated by aspect ratio).
  - Builds the HUD with `createWhiteboardUI(gameState)` from `src/ui/whiteboard.tsx` (copy of the legacy HUD minus the student list).
  - Instantiates the `THREE.Mesh` (PlaneGeometry) to act as the physical interactive surface (invisible but raycastable).
  - Instantiates the `CSS3DObject` wrapping the container and attaches it to the mesh hierarchy.

**Public properties**

- `mesh: THREE.Mesh`: The physical plane object. `main.ts` should raycast against this.
- `cssObject: CSS3DObject`: The visual object containing the UI.
- `resolution: { width: number, height: number }`: The internal pixel dimensions of the DOM, used for coordinate mapping.

**Key methods**

- `addToScene(webGLScene: THREE.Scene, cssScene: THREE.Scene, position: THREE.Vector3, rotationY?: number)`: 
  - Positions the physical mesh and handles the dual-scene registration (WebGL + CSS3D) with necessary Z-offset adjustments. (Unchanged from previous logic).

- `render(gameState: GameState)` / `syncGameState(gameState)`:
  - Rebuilds the HUD via `createWhiteboardUI` (Header, facility/status panels, action buttons; students are now visualized in 3D status rings).
  - Assigns IDs/data attributes for action buttons (Train, Relax, Mock, Camp, Resign) and logs actions via console/debug hooks.

- `simulateClick(uv: THREE.Vector2)`:
  - Maps raycast UVs to screen-space coordinates and dispatches a synthetic click (flagged with `_whiteboardSynthetic`) to the DOM element under that point so CSS3D content can respond without re-entering the global click handler.

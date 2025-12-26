## GameState API (`src/core/GameState.ts`)

- Responsibility: owns the simulation state migrated from the legacy HUD game (students, facilities, economy, weather, and season flow) and exposes helpers the 3D UI can query or mutate.
- Types: `QualificationMap = Record<CompetitionName, Set<string>>`; `RelaxOptionId = 1 | 2 | 3 | 5`; `RelaxOption` shape `{ id, label, desc, cost }`; training types `TrainingTask` (id/name/difficulty/boosts), `TrainingResult`, `PerformTrainingResult`; `GameState` is the main export (module also defines internal `Facilities` helper plus random/clamp/name utilities).

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
- `getExpenseMultiplier()`: scales action expenses by active roster size (`max(0, active * 0.3)`).
- `getWeatherDescription()`: friendly weather string with a coarse temperature adjective.
- `getTrainingTasks(count = 6)`: returns and caches training tasks tailored to current average ability.
- `recordExpense(amount, description?)`: applies global `COST_MULTIPLIER`, deducts from budget with floor at 0, accumulates `totalExpenses`, returns the charged amount.
- `advanceWeeks(weeks = 1)`: recovers weekly pressure, increments `week`, refreshes weather per week.
- `getRelaxOptions()`: returns the entertainment options array with labels/desc/cost adapted to current weather text.
- `performRelax(optionId)`: validates facility/budget for the option, records expense, applies per-student pressure/mental (and CS coding) adjustments mirroring the base-game rules, increments `weeksSinceEntertainment`, advances one week, and returns `{ success, message, cost, option }` or `{ success: false, error }`.
- `performTraining(taskId, intensity)`: mirrors the base-game training flow (library/computer/weather/comfort modifiers, intensity + difficulty pressure, canteen reduction, sickness penalty, training effect multiplier, pressure increase), updates knowledge/ability for active students, advances one week, refreshes weekly tasks, and returns `PerformTrainingResult` or `{ success: false, error }`.
- `updateWeather()`: derives month/season from `week`, consults province climate (or fallback per region), samples temperature via normal distribution, then assigns weather (`晴`/`阴`/`雨`/`雪`) with seasonal precipitation odds; has a catch-all fallback generator if anything throws.
- `recoverWeeklyPressure()`: weekly decay on each active student’s `pressure`, `pressure_modifier`, and `comfort_modifier` by `RECOVERY_RATE`, never below 0.

**Notable internals** (private but important for behavior)

- `createStudents(count)`: shuffles seat ids 1–9, samples thinking/coding/mental from a normal distribution within province ability ranges and difficulty offset, names students `${provinceName || "学生"}-${n}`.
- `createEmptyQualificationMap()`: initializes Sets for every competition name; used for both qualification slots.
- Random helpers `uniform`, `normal`, `clamp`, `generateName` live in module scope (not exported).

**Constants (from `src/lib/constants.ts`)**

- `PRESSURE_THRESHOLD_MEDIUM = 70`, `PRESSURE_THRESHOLD_HIGH = 90` for UI/pressure warnings.

## Whiteboard API (`src/scene/Whiteboard.ts`)

- Responsibility: renders the HUD-style whiteboard UI on a CSS3D plane in the scene, exposes helpers to refresh UI content and forward 3D hits into DOM clicks.
- Public properties: `cssObject: CSS3DObject` (visual DOM surface attached to board), `mesh: THREE.Mesh` (invisible physics plane tagged with `userData.whiteboard = true`), `resolution` (DOM pixel size).

**Constructor**

- `new Whiteboard(width: number, height: number)`: builds a DOM root sized to a fixed width of 1400px and proportional height, wraps it in a `CSS3DObject` scaled to fit the requested board size, and pairs it with a transparent double-sided plane mesh for raycasting.

**Methods**

- `addToScene(webGLScene, cssScene, position, rotationY?)`: positions both the mesh and CSS3D object, adds them to the provided scenes, and slightly offsets the CSS layer forward.
- `render(gameState)`: replaces the DOM root’s children with `createWhiteboardUI(gameState)` so text/buttons reflect the latest state.
- `clickAction(actionId)`: finds an action card by `data-action` and dispatches a click; safe no-op if not found.
- `simulateClick(uv, gameState)`: converts a raycast UV on the board plane into DOM `clientX/Y`, dispatches a synthetic click to the element under the pointer, and re-renders (currently for debugging).
- `dispose()`: detaches the mesh/CSS object from parents and disposes geometry/materials; removes DOM root from the document.

## Student API (`src/core/Student.ts`)

- Core fields: `name`, `thinking`, `coding`, `mental`, `knowledge` (per `KnowledgeType`), `pressure`, `comfort`, `comfort_modifier`, `pressure_modifier`, `sick_weeks`, `seatId`, `active`, `talents: Set<string>`.
- Ability helpers: `getAbilityAvg()`, `getKnowledgeTotal()`, `getComprehensiveAbility()`, `getMentalIndex()`, `getPerformanceScore(difficulty, maxScore, knowledgeValue)` (probabilistic contest score).
- Knowledge/ability mutators: `addKnowledge(type, amount)`, `addThinking(amount)`, `addCoding(amount)`.
- Rendering assets: shared `visuals` texture bundle (`avatarTexture`, `statusRingTexture`, `ready` promise) used by avatars/status rings.

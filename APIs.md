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

## Contest API (sketch) (`src/core/Contest.ts`)

- Responsibility: encapsulate contest simulation migrated from `base-game/lib/competitions.js`; tracks contest setup, per-student progress, ticking loop, logging, and finish bookkeeping for the 3D UI.
- Drive model: whiteboard (or another caller) owns the loop and calls `tick()` procedurally; the class does not schedule timers or hold render callbacks. UI pulls state/logs directly.
- Dependencies: relies on `Student`, `GameState` (for post-contest updates), contest definitions (`COMPETITION_SCHEDULE`), and timing constants like `TICK_INTERVAL`.

**Public fields**

- `config`: contest definition `{ name, duration, isMock: boolean, problems: Array<{ id, tags, difficulty, maxScore, subtasks }> }`.
- `students: ContestStudentState[]`: per-student contest states (wrapper around the source Student instances).
- `currentTick: number`: how many ticks have elapsed.
- `maxTicks: number`: total ticks for the contest (`duration / TICK_INTERVAL`).
- `logs: ContestLog[]`: accumulated log entries (`{ tick, time, message, type, studentName, timestamp }`).

**Constructor**

- `constructor(contestConfig, students)`: clones the contest config, wraps incoming `Student` instances into `ContestStudentState`, seeds tick counters.

**Public methods**

- `tick()`: advance one contest tick; run per-student simulation, append logs, increment `currentTick`. No timers are scheduled.
- `updateGameState(gameState: GameState)`: after the contest ends, inline the mistake system, unwrap students, and update the game state (student mental drift, ability boosts for mock contests, qualification/promotion maps for real contests). Throws an error if the contest is not ended yet.

**Private helpers**

- `selectProblem(state, student)`: default selection of next unsolved problem weighted by difficulty/ordering and talents; delegates to `state.getNextProblem()` so talents can override the behavior per instance.
- `selectBestSubtask(student, problem, thinkingTime)`: pick the most suitable subtask (full score vs partial) considering abilities, knowledge, and time spent; injects stochasticity.
- `attemptSubtask(student, problem, subtask)`: compute pass/fail based on thinking/coding difficulty, knowledge penalties, mental stability, and talent hooks.
- `shouldSkipProblem(state, student)`: decide whether to skip after spending sufficient time relative to difficulty.
- `getKnowledgeForProblem(student, problem)`: average the student’s knowledge over the problem’s tags.

**ContestStudentState (nested helper)**

- Responsibilities: wrap a `Student` during contest simulation, hold per-problem status, and expose overridable hooks that talents can patch (e.g., `getNextProblem()` for “稳扎稳打”).
- Fields: `student` (original Student), `problems` (per-problem status with `currentSubtask`, `maxScoreEarned`, `solved`, `attemptedSubtasks`, `mistakePenalty`/`reason`), `currentTarget`, `totalScore`, `thinkingTime`, `recentlySkippedProblems`, `tick`, `totalTicks`, and optionally `custom`/`userData` for talent-specific state.
- Methods: `getProblem(id)`, `updateScore(problemId, newScore)`, `markSolved(problemId, score)`, `getUnsolvedProblems()` (with skip filtering), `resetSkipLock()`, `getNextProblem()` (default chooser; designed for per-instance overrides by talents), and other bookkeeping helpers used by the simulator. All hooks are instance methods to allow monkey-patching per student.

## Whiteboard UI (`src/ui/whiteboard.tsx`)

- Responsibility: builds the CSS3D whiteboard DOM for the 3D scene: dashboard panels, actions, and in-modal flows (train, relax, contest).
- Views: `dashboard` (default), `train`, `relax`, `contest`.
- Next contest display: reads `COMPETITION_SCHEDULE`, shows the upcoming official contest and how many weeks remain (or “本周”).
- Action cards: on contest weeks, replaces the four actions with a single highlighted “参加 <比赛>” card. Otherwise shows Train/Relax/Mock/Camp cards.
- Contest flow: clicking the contest card creates an in-memory `Contest`, switches to `contest` view, renders the live contest modal inside the whiteboard. On finish, applies contest gains, logs the completion using the pre-advance week number, advances one week, and returns to dashboard.

## Modals

Each modal file exports a function which takes gameState and others as parameter and return a DOM element with callbacks being closure on the parameters.

- `src/ui/modals/train.tsx`: training modal (select task/intensity, confirm/cancel) used by the whiteboard train view.
- `src/ui/modals/relax.tsx`: entertainment modal (options grid, confirm/cancel/status) used by the whiteboard relax view.
- `src/ui/modals/buttons.tsx`: shared circular confirm/cancel buttons for modals.
- `src/ui/modals/contest.tsx`: live contest modal (student cards, progress/time header, log panel, pause/resume/skip/finish/close). Expects a `Contest` instance and callbacks `onFinish`/`onClose`; driven procedurally by the caller (whiteboard). Contains its own modal/dialog styles so it renders correctly inside the CSS3D whiteboard container.
## Student API (`src/core/Student.ts`)

- Dependency graph: required by ContestStudentStates.
- Core fields: `name`, `thinking`, `coding`, `mental`, `knowledge` (per `KnowledgeType`), `pressure`, `comfort`, `comfort_modifier`, `pressure_modifier`, `sick_weeks`, `seatId`, `active`, `talents: Set<string>`.
- Ability helpers: `getAbilityAvg()`, `getKnowledgeTotal()`, `getComprehensiveAbility()`, `getMentalIndex()`.
- Knowledge/ability mutators: `addKnowledge(type, amount)`, `addThinking(amount)`, `addCoding(amount)`.
- Rendering assets: shared `visuals` texture bundle (`avatarTexture`, `statusRingTexture`, `ready` promise) used by avatars/status rings.

OITrainer 3D migration status

- Project: migrating the HUD-only web sim OITrainer into a first-person 3D classroom for the Advanced Computer Graphics course. Goal: keep original gameplay logic/UI displayed on a 3D whiteboard and trigger actions via in-world hotspots/buttons. Package manager: pnpm (`pnpm dev|build|preview`).
- Repo layout: legacy game frozen in `base-game/`; new 3D app in `src/` using Vite + TypeScript + Three.js (`package.json` scripts mirror pnpm). Public assets live in `public/assets/*` for models/textures.
- Base game snapshot (`base-game/`): pure DOM/HUD implementation. Key files: `game.html` entry plus `start.html`/`help.html`; `game.js` (core state + weekly loop/events), `render.js` (UI rendering), `events.js` (event pool), `tutorial.js` and test/demo HTMLs; shared CSS in `styles.css`; assets under `assets/`. This logic is the source of truth to re-use inside the 3D UI. Core logic stores variables as attributes of `window` object, which is discouraged for long-term maintainence.
- Rendering bootstrap (`src/main.ts`): builds `WebGLRenderer` with MSAA, 60° perspective camera at eye height 1.6 m, resize handling, RAF loop, and delegates scene creation to the classroom loader. Pointer-lock is triggered on click.
- First-person controls (`src/controls/input.ts`): WASD + mouse look via `PointerLockControls`, walk speed 3.5, camera clamped to a 6.5 x 4.5 m rectangle and locked at constant eye height; clean add/remove of keyboard listeners.
- Classroom scene (`src/scene/classroom.ts`): constructs a 14 x 10 x 4 m room with tiled wood floor, neutral walls, ambient + directional key light plus a bluish point light near the whiteboard. Uses `GLTFLoader` with a URL modifier to fall back to a wood texture when model textures are missing.
- Assets (`public/assets/models/*`): loads desk, chair, player (奶龙), and whiteboard; normalizes pivots and scales; lays out a 2 x 2 seat grid, clones meshes per seat, tags each player hierarchy with `userData.playerId`, and adds a translucent status ring to each avatar.
- Current interactions: free first-person roaming only; no gameplay UI hooked yet. Knowledge enum stub exists in `src/lib/enums.ts` for future data binding.
- Open work: wire original OITrainer logic/round flow to 3D UI (whiteboard display + wall buttons), add interaction hotspots for training/competition/other events, surface player state on status rings/overlays, and implement planned extras from `project.md` (collisions, audio/VFX polish, camera shake, multiplayer/options, etc.).

TODO

- [x] Migrate basic enums and constants to `src/lib/enums.ts` and `src/lib/constants.ts`.
- [x] Migrate `Student` class to `src/core/Student.ts`.
- [x] Migrate the event system to `src/lib/enums.ts`.
- [x] Migrate `Talent` to `src/core/Talents.ts` with an interface and the data (partially done, except for event handler).
- [x] Migrate `GameState` class to `src/core/GameState.ts`.
- [x] Create `src/ui/start.ts`, containing the initial HUD for the player to select game options.

BUG

- [x] Sensitivity added. ~~Mouse sensitivity normal on Mac but too slow on Arch Linux.~~
- [ ] When not in fullscreen mode, perspective rotation keeps going downward each update, probably because the center for calculating offset is not the same for adjusting mouse. This is probably Three.js's fault, but we will fix it later.

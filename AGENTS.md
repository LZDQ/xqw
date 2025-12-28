## OITrainer 3D migration status

- Project: migrating the HUD-only web sim OITrainer into a first-person 3D classroom for the Advanced Computer Graphics course. Goal: keep original gameplay logic/UI displayed on a 3D whiteboard and trigger actions via in-world hotspots/buttons. Package manager: pnpm (`pnpm dev|build|preview`).
- Repo layout: legacy game frozen in `base-game/`; new 3D app in `src/` using Vite + TypeScript + Three.js (`package.json` scripts mirror pnpm). Public assets live in `public/assets/*` for models/textures.
- Base game snapshot (`base-game/`): pure DOM/HUD implementation. Key files: `game.html` entry plus `start.html`/`help.html`; `game.js` (core state + weekly loop/events), `render.js` (UI rendering), `events.js` (event pool), `tutorial.js` and test/demo HTMLs; shared CSS in `styles.css`; assets under `assets/`. This logic is the source of truth to re-use inside the 3D UI. Core logic stores variables as attributes of `window` object, which is discouraged for long-term maintainence.

## Dev guidelines for codex

Use `pnpm -s tsc --noEmit` to type check the project. Each commit should pass the type check. UI should copy base-game's HTML and CSS.

## BUGs

- [x] Sensitivity added. ~~Mouse sensitivity normal on Mac but too slow on Arch Linux.~~
- [ ] (Firefox only) When not in fullscreen mode, perspective rotation keeps going downward each update, probably because the center for calculating offset is not the same for adjusting mouse. This is probably Three.js's fault, but we will fix it later.
- [x] Fixed. ~~The contest modal's confirm button, when clicked using unlocked mouse, behaves differently than when clicked using the 3D pointer.~~

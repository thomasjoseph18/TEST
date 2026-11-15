# BUILDSCAPES: Apollo to Artemis — Development Progress (checkpoint backup)

- Sandbox git branch: `integrate-game-fix-sandbox` (branched from `buildscapes-game`; your own `integrate-game-fix` branch was NOT visible to me, see below). main untouched.
- Commits: `8a2bc3e` first game checkpoint (parent `b587d60`), `85aafa8` render-loop fix, then 'Brighten habitat interior' (see `git log`).
- `docs/changes-since-first-checkpoint.patch` = only the source/test changes made after the first checkpoint (apply onto your branch with `git apply --3way`). `docs/buildscapes-game-checkpoint.patch` = the first checkpoint commit.
- Phase 0 notes are preserved in `docs/PHASE0_PROGRESS.md`.

## What is completed (code exists and typechecks)
**Engine (pure, unit-tested):** `src/engine/field.ts` (suit O2/power/health, radiation + solar storms, rover battery/damage, food + hydroponics, crew health, refill costs drawn from the habitat), `src/engine/objectives.ts` (9 objectives per planet, 8 site tasks with cadet quizzes, XP, ranks, mission scoring/stars), save additions (`field` per destination, `game` progress; save version stays 2, old saves migrate), `resetDestinationProgress`. Phase 0 simulation untouched; hook gained `getState`, `drawResources`, and `advanceSol` now returns the new state.

**Game layer `src/game/`:** `GameApp.tsx` (one persistent WebGL canvas, scene routing, fades/loading cover, SceneApi, pause/Esc, hotkeys J K O N, NOVA bubble, toasts, Sol briefing, debrief), `FirstPersonRig.tsx` (pointer-lock look + drag-look fallback, WASD, collision, low-gravity hop, proximity interaction with hold-E), scenes: `IntroScene` (Apollo 13 3D cinematic), `CommandScene`, `HabitatScene`, `SurfaceScene` (Moon + Mars, drivable rover, sites, solar array, sample station, charge pad), `DebriefScene`; `terrain.ts` (shared deterministic heightfield: Moon south pole with PSR crater/Shackleton rim, Mars Jezero delta/glacier ridge), `props.tsx`, `textures.ts` (procedural, no external assets), `audio.ts` (procedural WebAudio + optional speech), HUD/panels/cinematic/debrief UI in `src/game/ui/`, `game.css`.
**Data:** `src/data/apollo13.ts` (16 beats tagged REAL vs STORY, exact quote only for "Houston, we've had a problem", sources + disclaimer).
**Default UI mode is now `game`** (`DEFAULT_UI_MODE`); Classic Mode still works from Pause > Switch to Classic / Settings. Existing saves that already stored `uiMode: classic` stay classic.

## IMPORTANT: which code is this?
The `.7z` you uploaded contains `buildscapes-game` at `b587d60` plus the 23 recovered game files as *untracked* files, with the original (unintegrated) App.tsx etc. Your `integrate-game-fix` branch and its repair patch were not in any upload, so I could not inspect them. My game files are byte-identical to the recovery bundle's 23 new files. Everything below was done on my own integrated copy. Merge the changes listed in `docs/changes-since-first-checkpoint.patch` into your branch; if your repair patch touched the same files, resolve by hand. Please upload `git diff b587d60 integrate-game-fix` (or the tracked files) if you want me to work directly on your branch.

## Fixed this session
1. **Moon visuals stuck after leaving the habitat (root cause found).** `SurfaceScene` registered `useFrame(..., 1)`. In React Three Fiber a positive priority disables automatic rendering, so once the surface mounted nothing drew and the last habitat frame stayed on screen. Fix: priority removed. Proof: the renderer's frame counter froze at 209 before the fix and keeps rising after it. Regression test added (`tests/game.test.ts`, mutation-checked: it fails if the bug is reintroduced).
2. Habitat interior brightened (floor and lighting).

## Verified by running (headless Chromium + software WebGL, real key input, zero console errors)
| Check | Result |
|---|---|
| `tsc --noEmit` | 0 errors |
| `npm test` | 55/55 pass (34 Phase 0, 20 game, 1 R3F render-loop guard). One Phase 0 assertion deliberately changed: `DEFAULT_UI_MODE` is now `'game'`. |
| esbuild bundle (stand-in) | builds. `vite build` NOT run here (no usable vite binary offline); you reported your own build passes. |
| Opening cinematic | title card, all beats, REAL/STORY tags, skip, step, end, "Begin training", replay from the Apollo exhibit, skip replay |
| Command centre -> mission table -> Launch -> habitat -> airlock -> Moon | works; frames keep rendering (frozen-scene bug fixed) |
| Habitat | oxygen panel + Boost mode changes the simulation; Esc closes panels |
| Moon | hold-E sample drill; rover board/drive/brake/exit with battery drain; Apollo memorial, **PSR cold trap (cold-shadow chip)**, **Shackleton rim** and **traverse station** tasks all complete; quiz XP + journal |
| Sol cycle | bunk/sleep -> Sol briefing; autopilot to Sol 30 -> debrief (stars/XP) -> Moon complete -> Mars unlocked -> Mars habitat |
| Mars | surface renders; MOXIE task + quiz by holding E |
| Systems | low-suit **emergency recovery** (respawn at airlock, crew penalty); **restart mission** resets only that planet; **Classic Mode switch** from Pause |
| No-WebGL | explanation card + Open Classic Mode works (loading cover no longer lingers) |
| NOT run | real GPU/frame rate, pointer lock with a real mouse, audio/voice by ear, touch, Mars debrief, Mars rover/other 3 Mars sites by hand (same code path as Moon sites), `vite build` here |

## Known bugs / rough edges
1. Moon ground is dark on slopes facing away from the Sun; Earth is only visible when looking toward it.
2. Autopilot (skip Sols) without managing settings finishes with 1 star: intended difficulty, but tune with a real child tester.
3. HUD is crowded at very small windows (<640 px wide); layout is designed for laptop screens.
4. Habitat/command scenes are heavy in software GL (about 2 fps); not measured on a GPU.
5. Controls are keyboard + mouse only.
6. `#debug` in the URL exposes `window.__bsGame/__bsPlayer/__bsThree` (used by tests).
7. Fonts depend on the Google Fonts link already in index.html.
8. Audio and speech were never listened to on a real device.

## Exact next steps
1. Merge `docs/changes-since-first-checkpoint.patch` into `integrate-game-fix`; run `npm run typecheck && npm test && npm run build && npm run dev`.
2. In a real browser: confirm leaving the habitat now shows the Moon (the fix), click the view to capture the mouse, play the loop above with a gamepad-less laptop.
3. Play Mars (delta, MOXIE, dust mast, glacier) and the PSR crater and rim on foot; check suit-drain balance (`SUIT_RATES` in `src/engine/field.ts`) against distances (`src/game/terrain.ts`).
4. Add NOVA reactions after discoveries, a first-run tutorial, footsteps/dust puffs, and an Artemis end-screen polish.
5. Profile on a laptop GPU; if slow lower `boulderCount`, terrain segments or turn shadows off by default.

# BUILDSCAPES: Apollo to Artemis — Development Progress

Branch: `buildscapes-game`. `main` is untouched (still `c110011`).
Phase 1 (Apollo 13 cinematic) has NOT been started, by instruction.

## Status summary
**Phase 0 (Foundation): complete in code, pending your local install + production build.**

## What was actually run in the authoring sandbox
| Check | Result |
|---|---|
| `npm test` (Node 22.23, 34 tests across 3 files) | 34 passed, 0 failed |
| `tsc --noEmit -p .` (global TypeScript 6.0.3) | 0 errors |
| Server-render smoke test of GameShell, CrashScreen, WebGLFallback, ErrorBoundary (one-off, not in the suite) | passed |
| Mutation check (changed one battery constant in the engine) | differential tests failed as they should, then I restored it |
| `vite build` | **NOT RUN** (sandbox has Windows-only binaries in `node_modules` and no network) |
| Anything in a real browser (rendering, pointer lock, WebGL, localStorage, React effects, StrictMode) | **NOT RUN** |

The project's declared compiler is TypeScript ^7; I checked with 6.0.3. Re-run `npm run typecheck` with your install.

Run locally: `npm install && npm run typecheck && npm test && npm run build`.
Tests need Node >= 22.6 (they use `--experimental-strip-types`; the flag is harmless on newer Node).

## Phase 0 deliverables

1. **Simulation engine** `src/engine/simulation.ts` — pure functions, equations copied unchanged.
2. **Game state machine** `src/engine/gameState.ts` — screens: boot, intro, command, navigation, habitat, surface, debrief, classic. Invalid transitions are ignored. Mars needs `progress.moonTrainingComplete`; Artemis never unlocks. Wired in `App.tsx` via `useReducer`.
3. **Classic-mode switch** — Settings > Experience Mode (Classic / Game preview). Persisted. Default is **classic** (`DEFAULT_UI_MODE` in `src/engine/settings.ts`; flip to `'game'` when the Command Centre ships in Phase 2). Game mode currently shows `GameShell`, a developer preview that walks every transition; it is not the final UI. Switching modes keeps all progress.
4. **Error boundaries** — root boundary with `CrashScreen` (try again, reload, open Classic Mode, reset progress behind a confirmation); a boundary around the 3D canvas that falls back to a static starfield and clears when you navigate.
5. **WebGL detection and fallback** `src/engine/webgl.ts`, `WebGLFallback.tsx` — v2/v1/software-only/none/exception. Context loss is handled. POV tabs show an explanation with an exit button; "Try 3D anyway" is offered only when WebGL exists but was judged slow. Habitat controls, journal and achievements stay usable without WebGL.
6. **Settings persistence** — settings now live in the versioned save and are sanitised on load. New settings: reduced motion (seeded once from the OS preference), captions, master volume, Experience Mode, plus the existing call-sign, audio, NOVA voice, text size and performance mode.
7. **Storage safety** — `resolveStorage` falls back to memory if `window.localStorage` throws or is full, and the UI shows a "progress can't be saved" notice.
8. **Save system** (`src/engine/save.ts`, version 2) — per-destination simulations and journals, achievements, completed sites, viewed sites, progress flags, settings. Migrates legacy `buildscapes_achievements` and `buildscapes_explored_sites`; ignores the old pre-unlocked `first_touchdown`; saves from before settings existed gain defaults.
9. **Achievements** (`src/engine/achievements.ts`, `src/engine/progress.ts`) — unlock only from game events. See "Future science tasks" below.

## Verification you asked for
- **Original calculations unchanged.** `tests/fixtures/original-hook.ts` is a frozen copy of the original hook from `main` (only import paths differ). `tests/differential.test.ts` runs it against the pure engine through 60 seeded random sessions per planet (5,400 compared steps), comparing full state, derived calculations and journal entries; all identical. The refactored React hook is compared the same way, including 1-3 actions in a single tick.
- **Moon and Mars independent.** Tested at the engine level, at the hook level through a destination switch (Moon progress identical after returning), and through save round-trips.
- **Save migration / journal persistence.** Tested: legacy keys, corrupt JSON and wrong types, settings-less saves, throwing storage, a played session surviving a reload (journal, both sims, achievements, settings). Not tested in a real browser.
- **Integration bug found and fixed during review:** the previous hook read render-time state, so two actions in one tick could overwrite each other. It now updates a ref synchronously.

## Future Moon/Mars science tasks: how to hook in
Call `completeSiteTask(save, destination, siteId)` from `src/engine/progress.ts` when a task is COMPLETED. It rejects unknown or wrong-destination IDs, is idempotent, and emits `site_task_completed`; `planetary_geologist` unlocks only when every site for that destination is completed (4 per planet today). Site IDs come from `src/data/exploration.ts`. Clicking markers or viewing a site (`markSiteViewed`) never unlocks anything. For new achievements: add the ID to `ACHIEVEMENT_IDS` and `INITIAL_ACHIEVEMENTS` (a test fails if they drift) and add a rule in `evaluateAchievements`. App-side wiring for `completeSiteTask` (a handler plus `setSave`) is not written yet because nothing calls it until Phase 3.

## Behaviour changes vs the original app (intentional)
- Switching Moon/Mars no longer resets either simulation or journal. "Reset" restarts only the active destination.
- Journal entries now persist.
- Achievement rules follow their on-screen criteria (solar cleaning at 10% dust; water/oxygen/power need sustained results at the end of a Sol; Sol-15 needs O2>50, water>50, integrity>70). `first_touchdown` unlocks when a mission starts instead of being pre-unlocked.
- Clicking POV markers or exploration cards no longer unlocks anything. The marker achievement IDs (`peak_light_scout` etc.) never existed in the data, so they were silent no-ops before.

## Known limitations (not fixed)
- Classic mode does NOT enforce "Mars unlocks after Moon", so no existing feature is removed. The lock is enforced by the game state machine only.
- Reduced motion applies to CSS animation only; the existing 3D scenes still bob/animate. Wire it into scenes in Phase 7. Captions and master volume are stored but nothing consumes them yet (no audio engine until Phase 1).
- Two browser tabs on the same save overwrite each other (last write wins).
- `hook.simulations` (React state) and `save.simulations` mirror each other; the hook is the writer. Fine now, worth unifying when the habitat scene needs the sim.
- Old `ExplorationView` "explored" badge now means "viewed" (shared with the save).
- `PROJECT_AUDIT.md` is outdated (describes a pre-scaffold repo). Existing UI still shows NASA-style branding; an original BUILDSCAPES emblem is still to do.
- POV terrain and object placement still use separate height logic; Phase 3 must introduce a single height source.
- `scripts/test_simulation_engine.mjs` is the old self-referential test (kept as `npm run test:legacy`); it proves nothing about the real code.
- `dist/` in the repo is stale and is excluded from the package; rebuild it locally.

## Next steps
1. Local: `npm install && npm run typecheck && npm test && npm run build`, then click through Classic Mode and Settings > Game Mode (preview). Report anything the sandbox could not see.
2. After you approve: Phase 1 (Apollo 13 cinematic, captions, WebAudio engine, REAL/FICTIONAL labels, skippable and replayable, with NASA-sourced fact verification and no graphic accident depiction).

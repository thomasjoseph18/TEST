import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameReducer, initialGameState, isDestinationUnlocked, type GameAction, type GameState } from '../src/engine/gameState.ts';
import { sanitizeSettings, defaultSettings, DEFAULT_UI_MODE } from '../src/engine/settings.ts';
import { detectWebGL } from '../src/engine/webgl.ts';
import { applyGameEvent, completeSiteTask, markSiteViewed, siteIdsFor } from '../src/engine/progress.ts';
import { createNewSave, loadSave, writeSave, migrateSave, SAVE_KEY, type StorageLike } from '../src/engine/save.ts';
import { advanceSolState, getInitialSimulationState } from '../src/engine/simulation.ts';
import { EXPLORATION_POINTS } from '../src/data/exploration.ts';

const locked = { moonTrainingComplete: false };
const open = { moonTrainingComplete: true };
const run = (s: GameState, ...a: GameAction[]) => a.reduce(gameReducer, s);
function mem(seed: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...seed };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; }, removeItem: (k) => { delete data[k]; } };
}

// ---------- game state machine ----------
test('state machine: first launch goes boot -> intro -> command; returning player skips intro', () => {
  const first = run(initialGameState(), { type: 'BOOT_DONE', introSeen: false, uiMode: 'game' });
  assert.equal(first.screen, 'intro');
  assert.equal(gameReducer(first, { type: 'INTRO_FINISHED' }).screen, 'command');
  assert.equal(run(initialGameState(), { type: 'BOOT_DONE', introSeen: true, uiMode: 'game' }).screen, 'command');
});

test('state machine: classic uiMode boots into classic, and exit returns to the right game screen', () => {
  const s = run(initialGameState(), { type: 'BOOT_DONE', introSeen: true, uiMode: 'classic' });
  assert.equal(s.screen, 'classic');
  assert.equal(gameReducer(s, { type: 'EXIT_CLASSIC' }).screen, 'command');
  const mid = run(initialGameState(), { type: 'BOOT_DONE', introSeen: true, uiMode: 'game' }, { type: 'OPEN_NAVIGATION' }, { type: 'ENTER_CLASSIC' });
  assert.equal(mid.screen, 'classic');
  assert.equal(gameReducer(mid, { type: 'EXIT_CLASSIC' }).screen, 'navigation');
  assert.equal(gameReducer(mid, { type: 'ENTER_CLASSIC' }), mid, 'entering classic twice is a no-op');
});

test('state machine: Mars is locked until Moon training is complete; Artemis never unlocks', () => {
  const nav = run(initialGameState(), { type: 'BOOT_DONE', introSeen: true, uiMode: 'game' }, { type: 'OPEN_NAVIGATION' });
  const tryMars = gameReducer(nav, { type: 'SELECT_DESTINATION', destination: 'mars', unlocks: locked });
  assert.equal(tryMars.destination, 'moon');
  assert.equal(tryMars.notice, 'mars_locked');
  const mars = gameReducer(nav, { type: 'SELECT_DESTINATION', destination: 'mars', unlocks: open });
  assert.equal(mars.destination, 'mars');
  assert.equal(mars.notice, null);
  const art = gameReducer(nav, { type: 'SELECT_DESTINATION', destination: 'artemis', unlocks: open });
  assert.equal(art.destination, 'moon');
  assert.equal(art.notice, 'artemis_locked');
  assert.equal(isDestinationUnlocked('moon', locked), true);
  assert.equal(isDestinationUnlocked('artemis', open), false);
});

test('state machine: invalid transitions are ignored and never throw', () => {
  const boot = initialGameState();
  for (const a of [{ type: 'GO_COMMAND' }, { type: 'ENTER_SURFACE' }, { type: 'MISSION_ENDED' }, { type: 'ENTER_CLASSIC' }, { type: 'INTRO_FINISHED' }] as GameAction[]) {
    assert.equal(gameReducer(boot, a), boot, a.type);
  }
  const cmd = run(boot, { type: 'BOOT_DONE', introSeen: true, uiMode: 'game' });
  assert.equal(gameReducer(cmd, { type: 'ENTER_SURFACE' }), cmd, 'cannot walk onto a surface straight from the command room');
  assert.equal(gameReducer(cmd, { type: 'BOOT_DONE', introSeen: false, uiMode: 'game' }), cmd, 'BOOT_DONE only valid while booting');
});

test('state machine: full journey command -> navigation -> habitat -> surface -> debrief -> command, and replay intro', () => {
  const s = run(initialGameState(),
    { type: 'BOOT_DONE', introSeen: true, uiMode: 'game' }, { type: 'OPEN_NAVIGATION' },
    { type: 'SELECT_DESTINATION', destination: 'moon', unlocks: locked },
    { type: 'ENTER_HABITAT' }, { type: 'ENTER_SURFACE' }, { type: 'MISSION_ENDED' });
  assert.equal(s.screen, 'debrief');
  const back = gameReducer(s, { type: 'DEBRIEF_DONE' });
  assert.equal(back.screen, 'command');
  assert.equal(gameReducer(back, { type: 'REPLAY_INTRO' }).screen, 'intro');
});

// ---------- settings ----------
test('settings: defaults, sanitising and clamping', () => {
  assert.equal(defaultSettings(true).reducedMotion, true);
  assert.equal(DEFAULT_UI_MODE, 'game'); // the first-person game is the default; classic remains selectable
  const s = sanitizeSettings({ callSign: '  <b>Zed</b>\n', masterVolume: 9, textSize: 'huge', uiMode: 'nope', captionsEnabled: 'yes', reducedMotion: false }, true);
  assert.equal(s.callSign, 'bZed/b');
  assert.equal(s.masterVolume, 1);
  assert.equal(s.textSize, 'normal');
  assert.equal(s.uiMode, DEFAULT_UI_MODE);
  assert.equal(s.captionsEnabled, true, 'non-boolean falls back to default');
  assert.equal(s.reducedMotion, false, 'explicit user choice beats OS preference');
  assert.deepEqual(sanitizeSettings(null), defaultSettings());
  assert.equal(sanitizeSettings({ masterVolume: NaN }).masterVolume, defaultSettings().masterVolume);
  assert.equal(sanitizeSettings({ callSign: 'x'.repeat(200) }).callSign.length, 24);
});

test('settings persist through the save and survive a reload; OS reduced-motion seeds only new saves', () => {
  const st = mem();
  const save = createNewSave(true);
  assert.equal(save.settings.reducedMotion, true);
  save.settings = { ...save.settings, callSign: 'Nova Ranger', lowPerformanceMode: true, masterVolume: 0.25, uiMode: 'game', reducedMotion: false };
  assert.ok(writeSave(st, save));
  const back = loadSave(st, true); // OS says reduce, but the user's saved choice wins
  assert.equal(back.settings.callSign, 'Nova Ranger');
  assert.equal(back.settings.lowPerformanceMode, true);
  assert.equal(back.settings.masterVolume, 0.25);
  assert.equal(back.settings.uiMode, 'game');
  assert.equal(back.settings.reducedMotion, false);
});

test('saves written before settings existed gain defaults without losing progress', () => {
  const old = createNewSave() as unknown as Record<string, unknown>;
  delete old.settings;
  old.progress = { moonTrainingComplete: true, introSeen: true };
  const m = migrateSave(old);
  assert.deepEqual(m.settings, defaultSettings());
  assert.equal(m.progress.moonTrainingComplete, true);
});

// ---------- WebGL detection ----------
test('webgl: detects v2, v1, software-only and no-context, and never throws', () => {
  const mk = (ok: (id: string, attrs?: Record<string, unknown>) => boolean) => () => ({ getContext: (id: string, attrs?: Record<string, unknown>) => (ok(id, attrs) ? {} : null) });
  assert.deepEqual(detectWebGL(mk((id) => id === 'webgl2')), { supported: true, version: 2 });
  assert.deepEqual(detectWebGL(mk((id) => id === 'webgl')), { supported: true, version: 1 });
  assert.deepEqual(detectWebGL(mk((id, a) => id === 'webgl' && !a?.failIfMajorPerformanceCaveat)),
    { supported: false, version: 0, reason: 'major_performance_caveat' });
  assert.deepEqual(detectWebGL(mk(() => false)), { supported: false, version: 0, reason: 'no_context' });
  assert.deepEqual(detectWebGL(() => { throw new Error('boom'); }), { supported: false, version: 0, reason: 'exception' });
});

// ---------- progression events: readiness for Moon/Mars science tasks ----------
test('progress: site task completion is validated, idempotent, and only completing ALL sites earns planetary_geologist', () => {
  const moonSites = siteIdsFor('moon');
  const marsSites = siteIdsFor('mars');
  assert.equal(moonSites.length, 4);
  assert.equal(marsSites.length, 4);
  let s = createNewSave();
  s = completeSiteTask(s, 'moon', 'not-a-site');
  s = completeSiteTask(s, 'moon', marsSites[0]);                 // wrong destination
  assert.deepEqual(s.completedSites, []);
  for (const id of moonSites.slice(0, -1)) s = completeSiteTask(s, 'moon', id);
  assert.equal(s.achievements.planetary_geologist, undefined, 'not yet');
  const again = completeSiteTask(s, 'moon', moonSites[0]);
  assert.deepEqual(again.completedSites, s.completedSites, 'idempotent');
  s = completeSiteTask(s, 'moon', moonSites.at(-1)!);
  assert.ok(s.achievements.planetary_geologist, 'all four moon sites completed');
  // Mars sites completed so far: none. Moon completion must not count toward Mars.
  assert.equal(s.completedSites.filter((x) => marsSites.includes(x)).length, 0);
});

test('progress: viewing/clicking a site never unlocks anything', () => {
  let s = createNewSave();
  for (const p of EXPLORATION_POINTS) s = markSiteViewed(s, p.id);
  assert.equal(s.viewedSites.length, EXPLORATION_POINTS.length);
  assert.deepEqual(s.achievements, {});
  assert.deepEqual(s.completedSites, []);
});

test('progress: Mars unlocks only after a genuine Moon victory (not Mars victory, not failure)', () => {
  const factsAt = (dest: 'moon' | 'mars', status: 'victory' | 'critical') => {
    let sim = getInitialSimulationState(dest);
    const r = advanceSolState(sim, dest)!;
    return { ...r.facts, status, sol: 30 };
  };
  let s = createNewSave();
  s = applyGameEvent(s, { type: 'sol_completed', facts: factsAt('moon', 'critical') });
  s = applyGameEvent(s, { type: 'sol_completed', facts: factsAt('mars', 'victory') });
  assert.equal(s.progress.moonTrainingComplete, false);
  s = applyGameEvent(s, { type: 'sol_completed', facts: factsAt('moon', 'victory') });
  assert.equal(s.progress.moonTrainingComplete, true);
  assert.ok(s.achievements.mission_graduate);
  // later events never re-lock it
  s = applyGameEvent(s, { type: 'sol_completed', facts: factsAt('moon', 'critical') });
  assert.equal(s.progress.moonTrainingComplete, true);
});

test('progress: events are pure (input save is not mutated)', () => {
  const s = createNewSave();
  const snap = JSON.stringify(s);
  applyGameEvent(s, { type: 'mission_started', destination: 'moon' });
  completeSiteTask(s, 'moon', siteIdsFor('moon')[0]);
  assert.equal(JSON.stringify(s), snap);
});

test('integration: a played session persists journal, both sims, achievements and settings across reload', () => {
  const st = mem();
  let save = loadSave(st);
  save = applyGameEvent(save, { type: 'mission_started', destination: 'moon' });
  const m = advanceSolState(save.simulations.moon, 'moon')!;
  save = { ...save, simulations: { ...save.simulations, moon: m.state }, journals: { ...save.journals, moon: [m.journalEntry] } };
  save = applyGameEvent(save, { type: 'sol_completed', facts: m.facts });
  save = { ...save, settings: { ...save.settings, callSign: 'Reloader' } };
  writeSave(st, save);
  const re = loadSave(st);
  assert.equal(re.simulations.moon.currentSol, 2);
  assert.equal(re.simulations.mars.currentSol, 1);
  assert.equal(re.journals.moon[0].id, 'sol-2-moon');
  assert.equal(re.journals.mars.length, 0);
  assert.ok(re.achievements.first_touchdown);
  assert.equal(re.settings.callSign, 'Reloader');
  assert.ok(st.data[SAVE_KEY].includes('"version":2'));
});

import { resolveStorage } from '../src/engine/save.ts';
test('storage: resolver survives a throwing localStorage getter and full-quota storage', () => {
  const blocked = resolveStorage(() => { throw new Error('SecurityError'); });
  assert.equal(blocked.persistent, false);
  blocked.storage.setItem('a', '1');
  assert.equal(blocked.storage.getItem('a'), '1', 'in-memory fallback works');
  const quota = resolveStorage(() => ({ getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } }));
  assert.equal(quota.persistent, false);
  const fine = mem();
  assert.equal(resolveStorage(() => fine).persistent, true);
  assert.equal(Object.keys(fine.data).length, 0, 'probe key is cleaned up');
});
